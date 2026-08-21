'use client';

// Simple i18n dictionary for FreightFlow (EN/FR/MG)
export type Lang = 'en' | 'fr' | 'mg';

export const LANG_LABEL: Record<Lang, string> = {
  en: 'EN · English',
  fr: 'FR · Français',
  mg: 'MG · Malagasy',
};

type Dict = Record<string, string | Record<string, string>>;

const en: Dict = {
  app: { name: 'FreightFlow', tagline: 'Logistics OS' },
  nav: {
    dashboard: 'Dashboard', livemap: 'Live Map', shipments: 'Shipments', air: 'Air Freight', sea: 'Sea Freight',
    customs: 'Customs', trucking: 'Trucking', customers: 'Customers', quotes: 'Quotes', rates: 'Rate Cards',
    invoices: 'Invoices', reports: 'Reports', tracking: 'Track & Trace', emails: 'Email Center',
    warehouse: 'Warehouse (WMS)', driver: 'Driver POD App', benchmark: 'CW Benchmark', settings: 'Settings',
  },
  common: {
    new: 'New', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', submit: 'Submit', search: 'Search',
    back: 'Back', next: 'Next', download: 'Download', upload: 'Upload', share: 'Share', close: 'Close',
    status: 'Status', date: 'Date', reference: 'Reference', customer: 'Customer', carrier: 'Carrier',
    weight: 'Weight', volume: 'Volume', pieces: 'Pieces', origin: 'Origin', destination: 'Destination',
    total: 'Total', actions: 'Actions', notes: 'Notes', yes: 'Yes', no: 'No', loading: 'Loading…',
    todaysJobs: "Today's Jobs", completed: 'Completed', active: 'Active',
  },
  shipment: {
    title: 'Shipments', subtitle: 'Air & Sea, Import & Export',
    progress: 'Shipment Progress', quoted: 'Quoted', booked: 'Booked', picked_up: 'Picked Up',
    in_transit: 'In Transit', customs: 'Customs', delivered: 'Delivered', cancelled: 'Cancelled',
    newShipment: 'New Shipment', createInvoice: 'Create Invoice', sharePortal: 'Share Portal Link',
    scheduleTrucking: 'Schedule Trucking', routeSchedule: 'Route & Schedule', cargoDetails: 'Cargo Details',
    from: 'From', to: 'To', etd: 'ETD', eta: 'ETA', incoterm: 'Incoterm', commodity: 'Commodity',
    awb_bl: 'MAWB / B/L', vessel: 'Vessel/Flight',
  },
  customs: {
    title: 'Customs Clearance', subtitle: 'ASYCUDA SAD declarations & duty management',
    prepareSad: 'Prepare SAD', lodgeEdi: 'Lodge to ASYCUDA (EDI)',
    downloadXml: 'Download SAD XML (UNeDocs)', downloadTxt: 'Download summary (.txt)',
    dutyAssessment: 'Duty & Tax Assessment', cifValue: 'CIF Value', importDuty: 'Import Duty',
    vat: 'VAT (20%)', otherTaxes: 'Other taxes', totalPayable: 'Total payable to Customs',
  },
  warehouse: {
    title: 'Warehouse (WMS)', subtitle: 'CFS operations, receipts and cargo items',
    expected: 'Expected', onHand: 'On Hand', reefer: 'Reefer', dg: 'DG', totalPieces: 'Pieces',
    totalWeight: 'Weight (t)', newReceipt: 'New WHR', registerArrival: 'Register Arrival',
    confirmUnload: 'Confirm Unload', confirmReceipt: 'Confirm Receipt', putAway: 'Put Away',
    confirmDevan: 'Confirm Devanning', releaseCargo: 'Release Cargo',
  },
  driver: {
    title: 'Driver POD App', subtitle: 'Capture proof of delivery on the go',
    arrived: "I've arrived", continueToSig: 'Continue to signature', skipPhoto: 'Skip photo',
    submitPOD: 'Submit POD', receiverName: 'Receiver name', piecesSigned: 'Pieces received',
    condition: 'Cargo condition', comments: 'Comments (optional)', signBelow: 'Sign below',
    clearSig: 'Clear signature', takePhoto: 'Tap to take photo', delivered: 'Delivery Complete!',
    good: 'Good order', damaged: 'Damaged', short: 'Short-ship', over: 'Over-ship',
  },
  email: {
    title: 'Email Center', subtitle: 'Two-way inbox · automated customer communications',
    sent: 'Sent', openRate: 'Open rate', opened: 'Opened', ctr: 'CTR (clicked)',
    compose: 'Compose', inbox: 'Inbox', unread: 'Unread', carriers: 'Carriers',
    customers: 'Customers', archived: 'Archived', reply: 'Reply',
  },
  portal: {
    heroTitle: 'Your cargo, in real time.',
    heroSubtitle: 'Track every step from pickup to delivery — 24/7 visibility, no login required.',
    enterRef: 'Enter AWB, B/L, or reference number', track: 'Track Shipment',
    requestQuote: 'Request a Quote', yourShipment: 'Your Shipment', co2e: 'CO₂ Footprint',
    estimatedDelivery: 'Estimated Delivery', lastUpdate: 'Last Update', documents: 'Documents',
    uploadDoc: 'Upload Document', shipmentHistory: 'Shipment History',
  },
  // Batch 8
  batch8: {
    approvals: 'Approvals', yard: 'Container Yard', exportCsv: 'Export CSV', oobo: 'Submit to OOBO',
    convertQuote: 'Convert to Shipment', installApp: 'Install App', offlineReady: 'Offline ready',
    notifications: 'Notifications', markAllRead: 'Mark all read', awaitingReview: 'Awaiting your review',
    installPwa: 'Install as App', pwaDesc: 'Add to Home Screen for full-screen app experience',
    csvShipments: 'Shipments (.csv)', csvInvoices: 'Invoices (.csv)', csvQuotes: 'Quotes (.csv)',
    csvYard: 'Yard inventory + moves (.csv)',
  },
};

const fr: Dict = {
  app: { name: 'FreightFlow', tagline: 'Système logistique' },
  nav: {
    dashboard: 'Tableau de bord', livemap: 'Carte en direct', shipments: 'Expéditions', air: 'Fret Aérien',
    sea: 'Fret Maritime', customs: 'Douanes', trucking: 'Camionnage', customers: 'Clients',
    quotes: 'Devis', rates: 'Tarifs', invoices: 'Factures', reports: 'Rapports', tracking: 'Suivi',
    emails: 'Centre Emails', warehouse: 'Entrepôt (WMS)', driver: 'Appli Chauffeur',
    benchmark: 'Benchmark CW', settings: 'Paramètres',
  },
  common: {
    new: 'Nouveau', save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier',
    submit: 'Envoyer', search: 'Rechercher', back: 'Retour', next: 'Suivant', download: 'Télécharger',
    upload: 'Téléverser', share: 'Partager', close: 'Fermer', status: 'Statut', date: 'Date',
    reference: 'Référence', customer: 'Client', carrier: 'Transporteur', weight: 'Poids',
    volume: 'Volume', pieces: 'Colis', origin: 'Origine', destination: 'Destination',
    total: 'Total', actions: 'Actions', notes: 'Notes', yes: 'Oui', no: 'Non', loading: 'Chargement…',
    todaysJobs: 'Missions du jour', completed: 'Terminées', active: 'En cours',
  },
  shipment: {
    title: 'Expéditions', subtitle: 'Aérien & Maritime, Import & Export',
    progress: 'Progression de l\'expédition', quoted: 'Devisé', booked: 'Réservé',
    picked_up: 'Enlevé', in_transit: 'En transit', customs: 'Douane', delivered: 'Livré', cancelled: 'Annulé',
    newShipment: 'Nouvelle expédition', createInvoice: 'Créer facture', sharePortal: 'Partager lien portail',
    scheduleTrucking: 'Planifier camionnage', routeSchedule: 'Route & planning', cargoDetails: 'Détails cargaison',
    from: 'De', to: 'Vers', etd: 'ETD', eta: 'ETA', incoterm: 'Incoterm', commodity: 'Marchandise',
    awb_bl: 'LTA / Connaissement', vessel: 'Vol/Navire',
  },
  customs: {
    title: 'Dédouanement', subtitle: 'Déclarations SAD ASYCUDA & gestion des droits',
    prepareSad: 'Préparer DUM', lodgeEdi: 'Transmettre à ASYCUDA (EDI)',
    downloadXml: 'Télécharger SAD XML (UNeDocs)', downloadTxt: 'Télécharger résumé (.txt)',
    dutyAssessment: 'Liquidation droits & taxes', cifValue: 'Valeur CAF', importDuty: 'Droits de douane',
    vat: 'TVA (20%)', otherTaxes: 'Autres taxes', totalPayable: 'Total à payer aux Douanes',
  },
  warehouse: {
    title: 'Entrepôt (WMS)', subtitle: 'Opérations CFS, bons d\'entrée et lignes de cargaison',
    expected: 'Attendus', onHand: 'En stock', reefer: 'Reefer', dg: 'MD', totalPieces: 'Colis',
    totalWeight: 'Poids (t)', newReceipt: 'Nouveau BEE', registerArrival: 'Enregistrer arrivée',
    confirmUnload: 'Confirmer déchargement', confirmReceipt: 'Confirmer réception', putAway: 'Mise en place',
    confirmDevan: 'Confirmer dépotage', releaseCargo: 'Libérer cargaison',
  },
  driver: {
    title: 'Appli Chauffeur POD', subtitle: 'Capturez les preuves de livraison sur le terrain',
    arrived: 'Je suis arrivé', continueToSig: 'Continuer vers signature', skipPhoto: 'Ignorer photo',
    submitPOD: 'Envoyer POD', receiverName: 'Nom du réceptionnaire', piecesSigned: 'Colis reçus',
    condition: 'État de la cargaison', comments: 'Commentaires (optionnel)', signBelow: 'Signez ci-dessous',
    clearSig: 'Effacer', takePhoto: 'Appuyer pour prendre photo', delivered: 'Livraison terminée !',
    good: 'Bon état', damaged: 'Endommagé', short: 'Manquant', over: 'En excédent',
  },
  email: {
    title: 'Centre Emails', subtitle: 'Boîte bidirectionnelle · communications clients automatisées',
    sent: 'Envoyés', openRate: "Taux d'ouverture", opened: 'Ouverts', ctr: 'Taux de clic',
    compose: 'Rédiger', inbox: 'Boîte', unread: 'Non lus', carriers: 'Transporteurs',
    customers: 'Clients', archived: 'Archivés', reply: 'Répondre',
  },
  portal: {
    heroTitle: 'Votre cargaison, en temps réel.',
    heroSubtitle: 'Suivez chaque étape de l\'enlèvement à la livraison — visibilité 24h/24 sans connexion.',
    enterRef: 'Entrez le n° LTA, B/L ou référence', track: 'Suivre l\'expédition',
    requestQuote: 'Demander un devis', yourShipment: 'Votre expédition', co2e: 'Empreinte CO₂',
    estimatedDelivery: 'Livraison estimée', lastUpdate: 'Dernière mise à jour', documents: 'Documents',
    uploadDoc: 'Téléverser un document', shipmentHistory: 'Historique',
  },
};

const mg: Dict = {
  app: { name: 'FreightFlow', tagline: 'Rafitry ny Fandefasana entana' },
  nav: {
    dashboard: 'Fandraisana', livemap: 'Sarintany mivantana', shipments: 'Entana', air: 'Fiaramanidina',
    sea: 'Sambo', customs: 'Fadintseranana', trucking: 'Kamiao', customers: 'Mpanjifa',
    quotes: 'Tombana', rates: 'Vidin\'ny dia', invoices: 'Faktiora', reports: 'Tatitra',
    tracking: 'Fanaraha-maso', emails: 'Mailaka', warehouse: 'Trano fitehirizana',
    driver: 'Fampiasa Mpamily', benchmark: 'Fampitahana CW', settings: 'Fikirana',
  },
  common: {
    new: 'Vaovao', save: 'Tehirizo', cancel: 'Aza atao', delete: 'Fafana', edit: 'Ahitsio',
    submit: 'Alefaso', search: 'Karohy', back: 'Miverina', next: 'Manaraka', download: 'Sintomy',
    upload: 'Ampidiro', share: 'Zarao', close: 'Akatona', status: 'Toe-javatra', date: 'Daty',
    reference: 'Fanondroana', customer: 'Mpanjifa', carrier: 'Mpitaty', weight: 'Lanja',
    volume: 'Haben\'ny entana', pieces: 'Isan\'ny fonosana', origin: 'Avy aiza', destination: 'Ho aiza',
    total: 'Fitambarany', actions: 'Hetsika', notes: 'Fanamarihana', yes: 'Eny', no: 'Tsia',
    loading: 'Eo am-pikarakarana…', todaysJobs: 'Asa androany', completed: 'Vita', active: 'Mbola atao',
  },
  shipment: {
    title: 'Entana', subtitle: 'Zotram-piaramanidina & an-dranomasina, Fanafarana & Fanondranana',
    progress: 'Fivoaran\'ny entana', quoted: 'Voaisa', booked: 'Voazaka', picked_up: 'Nalaina',
    in_transit: 'Eo am-pitaterana', customs: 'Eo am-pandinihana', delivered: 'Voaray', cancelled: 'Nofoanana',
    newShipment: 'Entana vaovao', createInvoice: 'Mamorona faktiora', sharePortal: 'Zarao rohy',
    scheduleTrucking: 'Manomana kamiao', routeSchedule: 'Lalana & Fotoana', cargoDetails: 'Antsipirihany',
    from: 'Avy any', to: 'Ho any', etd: 'ETD', eta: 'ETA', incoterm: 'Incoterm',
    commodity: 'Karazana entana', awb_bl: 'LTA / B/L', vessel: 'Zotram-piaramanidina/Sambo',
  },
  customs: {
    title: 'Fadintseranana', subtitle: 'Fanambarana SAD ASYCUDA & fitantanana hetra',
    prepareSad: 'Manomana SAD', lodgeEdi: 'Alefa any ASYCUDA (EDI)',
    downloadXml: 'Sintomy SAD XML (UNeDocs)', downloadTxt: 'Sintomy famintinana (.txt)',
    dutyAssessment: 'Fandoavana hetra & haba', cifValue: 'Sandam-bidy CAF', importDuty: 'Haban-tseranana',
    vat: 'VAT (20%)', otherTaxes: 'Hetra hafa', totalPayable: 'Tontalin-kalo amin\'ny Fadintseranana',
  },
  warehouse: {
    title: 'Trano fitehirizana (WMS)', subtitle: 'Asa CFS, tapakila fandraisana & entana',
    expected: 'Andrasana', onHand: 'Ao anaty trano', reefer: 'Reefer', dg: 'Mampidi-doza',
    totalPieces: 'Fonosana', totalWeight: 'Lanja (t)', newReceipt: 'WHR vaovao',
    registerArrival: 'Soraty fahatongavana', confirmUnload: 'Hamarino fampidinana',
    confirmReceipt: 'Hamarino fandraisana', putAway: 'Apetraho',
    confirmDevan: 'Hamarino fanokafana', releaseCargo: 'Alefa ny entana',
  },
  driver: {
    title: 'Fampiasa Mpamily (POD)', subtitle: 'Raiso an-tsoratra ny fanaterana',
    arrived: 'Tonga aho', continueToSig: 'Mankany sonia', skipPhoto: 'Tsy maka sary',
    submitPOD: 'Alefa POD', receiverName: 'Anaran\'ny nandray', piecesSigned: 'Isan\'ny fonosana voaray',
    condition: 'Toetry ny entana', comments: 'Fanamarihana (tsy voatery)', signBelow: 'Manaova sonia eto',
    clearSig: 'Mamafa', takePhoto: 'Tsindrio raha haka sary', delivered: 'Vita ny fanaterana !',
    good: 'Tsara', damaged: 'Simba', short: 'Latsaka', over: 'Mihoatra',
  },
  email: {
    title: 'Ivom-pandefasana mailaka', subtitle: 'Boaty fidirana roa · hafatra mandeha ho azy',
    sent: 'Nalefa', openRate: 'Tahan\'ny fisokafana', opened: 'Nosokafana', ctr: 'Tahan\'ny fipihana',
    compose: 'Manoratra', inbox: 'Hidirana', unread: 'Mbola tsy novakiana', carriers: 'Mpitaty',
    customers: 'Mpanjifa', archived: 'Voatahiry', reply: 'Mamaly',
  },
  portal: {
    heroTitle: 'Ny entanao, arahana mivantana.',
    heroSubtitle: 'Araho ny dingana rehetra manomboka amin\'ny fakana ka hatramin\'ny fanaterana.',
    enterRef: 'Ampidiro ny laharana LTA, B/L na référence', track: 'Jereo ny entana',
    requestQuote: 'Mangataka tombana', yourShipment: 'Ny entanao', co2e: 'Diovina CO₂',
    estimatedDelivery: 'Daty andrasana', lastUpdate: 'Fanavaozana farany',
    documents: 'Taratasy', uploadDoc: 'Mampiditra taratasy', shipmentHistory: 'Tantaran\'ny entana',
  },
};

const dicts: Record<Lang, Dict> = { en, fr, mg };

export function t(path: string, lang: Lang = 'en'): string {
  const parts = path.split('.');
  let node: any = dicts[lang] || dicts.en;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in node) node = node[p];
    else {
      // fallback EN
      let n: any = dicts.en;
      for (const pp of parts) {
        if (n && typeof n === 'object' && pp in n) n = n[pp];
        else return path;
      }
      return typeof n === 'string' ? n : path;
    }
  }
  return typeof node === 'string' ? node : path;
}

const LANG_KEY = 'ff_lang';
export function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'fr' || v === 'mg' || v === 'en') return v;
  } catch {}
  return 'en';
}
export function setLang(lang: Lang) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANG_KEY, lang);
  try { window.dispatchEvent(new CustomEvent('ff:lang-changed')); } catch {}
}
