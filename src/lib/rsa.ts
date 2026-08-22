'use client';
/**
 * Feature #4: Madagascar OOBO / DGI Fiscal e-invoice — RSA-SHA256 signing
 *
 * Uses the Web Crypto API (native to all modern browsers incl. Android Chrome
 * on Galaxy S20+) — no heavy crypto libs. Generates a 2048-bit RSA key pair on
 * first run, persists the JWK in localStorage, and produces a base64url
 * signature + a QR payload conforming to the DGI OOBO QR format:
 *
 *   [0]  issuer NIF (10 digits)
 *   [1]  client NIF (10 digits or 0000000000)
 *   [2]  invoice type (F/AV/AC)
 *   [3]  invoice number
 *   [4]  issue date (YYYYMMDD)
 *   [5]  HTVA (Ariary, integer)
 *   [6]  TVA rate (percent integer)
 *   [7]  TVA (Ariary)
 *   [8]  TTC (Ariary)
 *   [9]  RSA-SHA256 signature (base64url)
 *   [10] stamp UID (ooboUid)
 *
 * NOTE: This is a CLIENT-SIDE SIMULATION for demo/UAT. A homologated OOBO
 * solution must sign on a certified secure server or HSM.
 */

import qrcode from 'qrcode-generator';

const KEY_KEY = 'ff_oobo_rsa_key_v1';
const UID_KEY = 'ff_oobo_stamp_counter';

export interface FiscalSignResult {
  ooboUid: string;
  signature: string;        // base64url RSA-SHA256
  publicKeyJwk: JsonWebKey;
  qrPayload: string;
  qrDataUrl: string;        // SVG data URL for embedding in PDF/print
  signedAt: string;
}

function ab2b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function str2ab(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function getOrMakeKey(): Promise<CryptoKeyPair> {
  if (typeof window === 'undefined') throw new Error('no window');
  const subtle = crypto.subtle as any;
  const existing = localStorage.getItem(KEY_KEY);
  if (existing) {
    const jwk = JSON.parse(existing);
    const priv: CryptoKey = await subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as any,
      false, ['sign']
    );
    const pubJwk = { ...jwk };
    delete pubJwk.d; delete pubJwk.dp; delete pubJwk.dq;
    delete pubJwk.q; delete pubJwk.qi; delete pubJwk.p; delete pubJwk.qt;
    const pub: CryptoKey = await subtle.importKey(
      'jwk', pubJwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as any,
      true, ['verify']
    );
    return { privateKey: priv, publicKey: pub };
  }
  const kp: CryptoKeyPair = await subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' } as any,
    true, ['sign', 'verify']
  );
  const jwk = await subtle.exportKey('jwk', kp.privateKey);
  localStorage.setItem(KEY_KEY, JSON.stringify(jwk));
  return kp;
}

function nextStampUid(): string {
  const n = Number(localStorage.getItem(UID_KEY) || '2026000000') + 1;
  localStorage.setItem(UID_KEY, String(n));
  return `OOBO-MG-${n}`;
}

function pad10(s: string): string {
  return (s || '').replace(/\D/g, '').padEnd(10, '0').slice(0, 10);
}

export async function signFiscalInvoice(opts: {
  invoiceNumber: string;
  issueDate: string;
  nifEmitter: string;
  nifClient?: string;
  invoiceType: 'standard' | 'debit_note' | 'credit_note';
  htva: number;
  tvaRate: number;
  tva: number;
  ttc: number;
}): Promise<FiscalSignResult> {
  const kp = await getOrMakeKey();
  const subtle = crypto.subtle as any;
  const uid = nextStampUid();
  const dateStr = (opts.issueDate || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  const typeCode = opts.invoiceType === 'credit_note' ? 'AC'
    : opts.invoiceType === 'debit_note' ? 'AV' : 'F';

  const fields = [
    pad10(opts.nifEmitter),
    opts.nifClient ? pad10(opts.nifClient) : '0000000000',
    typeCode,
    opts.invoiceNumber,
    dateStr,
    String(Math.round(opts.htva)),
    String(Math.round(opts.tvaRate * 100)),
    String(Math.round(opts.tva)),
    String(Math.round(opts.ttc)),
    '', // signature placeholder
    uid,
  ];
  const signingInput = fields.slice(0, 9).join('|');
  const sigBuf: ArrayBuffer = await subtle.sign(
    'RSASSA-PKCS1-v1_5', kp.privateKey, str2ab(signingInput)
  );
  const sigB64 = ab2b64url(sigBuf);
  fields[9] = sigB64;
  const qrPayload = fields.join('|');

  // Render QR as an SVG data URL (works in jsPDF's addImage for SVG type).
  const qr = qrcode(0, 'M');
  qr.addData(qrPayload);
  qr.make();
  const svg = qr.createSvgTag(5, 2);
  const qrDataUrl = 'data:image/svg+xml;base64,' +
    btoa(unescape(encodeURIComponent(svg)));

  const pubJwk: JsonWebKey = await subtle.exportKey('jwk', kp.publicKey);
  return {
    ooboUid: uid,
    signature: sigB64,
    publicKeyJwk: pubJwk,
    qrPayload,
    qrDataUrl,
    signedAt: new Date().toISOString(),
  };
}
