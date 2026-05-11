import type { Locale } from "./config";

type Dictionary = {
  common: {
    home: string;
    propertyReels: string;
    watchReels: string;
    agentUploads: string;
    agentDashboard: string;
    backToHome: string;
    loading: string;
    save: string;
    cancel: string;
    close: string;
    submit: string;
    delete: string;
    edit: string;
    confirm: string;
    yes: string;
    no: string;
    language: string;
    viewsLabel: (count: number | string) => string;
    presentedBy: (agent: string) => string;
    priceOnRequest: string;
    propertyReelBadge: string;
    watchReel: string;
  };
  nav: {
    home: string;
    propertyReels: string;
  };
  footer: {
    brand: string;
    tagline: string;
    platform: string;
    propertyReels: string;
    status: string;
    statusText: string;
  };
  home: {
    badge: string;
    title: string;
    subtitle: string;
    viewReels: string;
    metricsReelsLabel: string;
    metricsReelsDetail: string;
    metricsPropertiesLabel: string;
    metricsPropertiesDetail: string;
    metricsAgentsLabel: string;
    metricsAgentsValue: string;
    metricsAgentsDetail: string;
    featuredEyebrow: string;
    featuredTitle: string;
    featuredText: string;
    featurePoint1: string;
    featurePoint2: string;
    browseReels: string;
    signatureEyebrow: string;
    signatureTitle: string;
    watchPropertyReels: string;
    launchEyebrow: string;
    launchTitle: string;
    launchText: string;
  };
  reels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    filters: string;
    empty: string;
  };
  reelViewer: {
    details: string;
    contactAgent: string;
    bookViewing: string;
    makeOffer: string;
    comments: string;
    like: string;
    liked: string;
    share: string;
    offer: string;
    book: string;
    whatsapp: string;
    sendMessage: string;
    yourName: string;
    yourEmail: string;
    yourPhone: string;
    yourMessage: string;
    preferredDate: string;
    preferredTime: string;
    offerAmount: string;
    notes: string;
    addComment: string;
    writeComment: string;
    reply: string;
    noComments: string;
    sending: string;
    sent: string;
    bookingTitle: string;
    bookingSubtitle: string;
    offerTitle: string;
    offerSubtitle: string;
    detailsTitle: string;
    requiredField: string;
    thankYou: string;
    backToReels: string;
    closeLabel: string;
    openComments: string;
    shareReel: string;
    makeOfferLabel: string;
    likeVideo: string;
    unlikeVideo: string;
    youAuthor: string;
    yourConsultant: string;
    dossierFallback: string;
    interestedWhatsapp: (title: string, location: string) => string;
    // video player
    muteVideo: string;
    unmuteVideo: string;
    processingReel: string;
    couldNotLoadVideo: string;
    // comments
    guest: string;
    officialAgent: string;
    writeCommentAria: string;
    addCommentPlaceholder: string;
    postCommentAria: string;
    couldNotPostComment: string;
    networkErrorRetry: string;
    commentsCount: (count: number | string) => string;
    closeComments: string;
    beFirstToComment: string;
    viewReplies: (count: number | string) => string;
    hideReplies: string;
    replyPlaceholder: string;
    sendReply: string;
    justNow: string;
    couldNotLoadComments: string;
    newest: string;
    mostLiked: string;
    beFirstOnReel: string;
    replyTo: (author: string) => string;
    replyAction: string;
    addReplyPlaceholder: string;
    writeReplyAria: string;
    postReplyAria: string;
    viewReply: string;
    sendingComment: string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
    daysAgo: (n: number) => string;
    pinned: string;
    likesCount: (n: number | string) => string;
    repliesPlural: (n: number) => string;
  };
  agentDashboard: {
    eyebrow: string;
    title: string;
    subtitle: string;
    reelsInLibrary: (count: number | string) => string;
    overviewLabel: string;
    notAuthorized: string;
    notAuthorizedText: string;
    // overview cards
    totalReels: string;
    totalReelsDetail: (published: number | string, draft: number | string) => string;
    reelViews: string;
    reelViewsDetail: string;
    likes: string;
    likesDetail: string;
    comments: string;
    commentsDetail: string;
    offers: string;
    offersTracked: string;
    noOffersYet: string;
    // reel performance table
    propertyReelsEyebrow: string;
    reelPerformance: string;
    colReel: string;
    colStatus: string;
    colViews: string;
    colLikes: string;
    colComments: string;
    colOffers: string;
    colSize: string;
    colUploaded: string;
    colActions: string;
    noReelsRow: string;
    // properties panel
    propertiesEyebrow: string;
    activeInventory: string;
    propertiesHint: string;
    latestReel: (status: string, date: string) => string;
    reelsCount: (count: number | string) => string;
    consultantLabel: (name: string) => string;
    noPropertiesDb: string;
    // engagement
    engagementEyebrow: string;
    likesAndComments: (count: number | string) => string;
    latestReelLabel: string;
    likesBadge: (count: number | string) => string;
    commentsBadge: (count: number | string) => string;
    signedInBuyer: string;
    guest: string;
    noCommentsYet: string;
    noLikesYet: string;
    noEngagementYet: string;
    // offers table
    offersEyebrow: string;
    offersFromReels: string;
    colProperty: string;
    colOfferAmount: string;
    colBuyer: string;
    colPhone: string;
    noOffersRow: string;
    refreshDashboard: string;
    refreshHint: string;
    // misc
    unknownViewer: string;
    noActivity: string;
    statusLabels: Record<string, string>;
    deleteConfirm: string;
    clearEngagement: string;
    clearEngagementConfirm: string;
    selectProperty: string;
    videoFile: string;
    chooseFile: string;
    uploading: string;
    saving: string;
  };
  admin: {
    eyebrow: string;
    title: string;
    subtitle: string;
    kpisLabel: string;
    totalAgents: string;
    activeCount: (count: number | string) => string;
    totalReels: string;
    publishedCount: (count: number | string) => string;
    totalLeads: string;
    fromAllReels: string;
    avgViews: string;
    acrossAllReels: string;
    agentsEyebrow: string;
    agentAccounts: string;
    colAgentName: string;
    colCompany: string;
    colStatus: string;
    colPlan: string;
    colTotalLeads: string;
    noAgents: string;
    reelsEyebrow: string;
    topPerformers: string;
    leadsAndAgent: (leads: number | string, agent: string) => string;
    noReels: string;
    propertyReelsEyebrow: string;
    allReels: string;
    colTitle: string;
    colAgent: string;
    colViews: string;
    colLeads: string;
    statusLabels: Record<string, string>;
  };
  live: {
    title: string;
    subtitle: string;
    startLive: string;
    joinLive: string;
    liveNow: string;
    noLiveSessions: string;
    replay: string;
    viewers: string;
  };
  notFound: {
    title: string;
    text: string;
    backHome: string;
  };
  uploadPanel: {
    addPropertyEyebrow: string;
    uploadReelEyebrow: string;
    addPropertyTitle: string;
    uploadReelTitle: string;
    addPropertyDesc: string;
    uploadReelDesc: string;
    tabAddProperty: string;
    tabUploadReel: string;
    propertyField: string;
    selectProperty: string;
    noPropertiesOption: string;
    reelTitleField: string;
    reelTitlePlaceholder: string;
    videoFileField: string;
    descriptionOptional: string;
    descriptionPlaceholder: string;
    uploadingPercent: (percent: number | string) => string;
    uploadReelButton: string;
    addPropertyFirstHint: string;
    chooseVideoFile: string;
    choosePropertyForReel: string;
    enterReelTitle: string;
    couldNotUpload: string;
    reelUploaded: (title: string) => string;
    reelPublishedNote: string;
    uploadSavedRegFailed: (status: number | string) => string;
  };
  addPropertyForm: {
    projectName: string;
    projectNamePlaceholder: string;
    location: string;
    locationPlaceholder: string;
    price: string;
    pricePlaceholder: string;
    currency: string;
    bedrooms: string;
    bathrooms: string;
    areaSqm: string;
    consultant: string;
    useAccountConsultant: string;
    consultantHint: string;
    coverImage: string;
    coverImageHint: string;
    coverPreviewAlt: string;
    description: string;
    descriptionPlaceholder: string;
    saving: (percent: number | string) => string;
    submit: string;
    coverNote: string;
    chooseCoverImage: string;
    couldNotSave: string;
    propertySaved: (title: string) => string;
    propertySavedNote: (location: string) => string;
    networkErrorSaving: string;
    saveCancelled: string;
    saveFailed: (status: number | string) => string;
  };
  bookingSheet: {
    title: string;
    requestSent: string;
    requestSentSub: string;
    selectDate: string;
    selectTime: string;
    fullName: string;
    phone: string;
    budget: string;
    budgetPlaceholder: string;
    messageOptional: string;
    sending: string;
    submit: string;
    couldNotBook: string;
  };
  offerSheet: {
    title: string;
    offerSent: string;
    offerSentSub: string;
    propertyAsking: string;
    yourOffer: string;
    offerAmountPlaceholder: string;
    fullName: string;
    phone: string;
    messageOptional: string;
    sending: string;
    submit: string;
    couldNotSubmit: string;
  };
  components: {
    // ConfirmDialog
    processing: string;
    closeDialog: string;
    // PropertyDeleteButton
    deleteAction: string;
    deletePropertyTitle: string;
    deletePropertyDesc: (title: string, reelCount: number) => string;
    couldNotDeleteProperty: string;
    deleteAria: (title: string) => string;
    // ClearEngagementButton
    deleteAll: string;
    deleteAllTitle: string;
    deleteAllDesc: string;
    couldNotDeleteEngagement: string;
    // ReelRowActions
    watch: string;
    updating: string;
    unpublish: string;
    publish: string;
    edit: string;
    couldNotUpdateStatus: string;
    couldNotDeleteReel: string;
    deleteReelTitle: string;
    deleteReelDesc: (title: string) => string;
    editReelTitle: string;
    editReelSubtitle: string;
    titleField: string;
    descriptionField: string;
    couldNotSaveReel: string;
    saving: string;
    saveChanges: string;
    networkError: string;
    requestFailed: (status: number | string) => string;
    deleteFailed: (status: number | string) => string;
  };
};

const tr: Dictionary = {
  common: {
    home: "Ana sayfa",
    propertyReels: "Mülk videoları",
    watchReels: "Videoları izle",
    agentUploads: "Danışman yüklemeleri",
    agentDashboard: "Danışman paneli",
    backToHome: "Ana sayfaya dön",
    loading: "Yükleniyor...",
    save: "Kaydet",
    cancel: "İptal",
    close: "Kapat",
    submit: "Gönder",
    delete: "Sil",
    edit: "Düzenle",
    confirm: "Onayla",
    yes: "Evet",
    no: "Hayır",
    language: "Dil",
    viewsLabel: (count) => `${count} görüntülenme`,
    presentedBy: (agent) => `Sunan: ${agent}`,
    priceOnRequest: "Fiyat için iletişime geçin",
    propertyReelBadge: "Mülk videosu",
    watchReel: "Videoyu izle",
  },
  nav: {
    home: "Ana sayfa",
    propertyReels: "Mülk videoları",
  },
  footer: {
    brand: "HB Real Estate",
    tagline:
      "Premium ilanlar, özel görüntülemeler ve niyetli alıcı keşfi için dikey mülk video turları.",
    platform: "Platform",
    propertyReels: "Mülk videoları",
    status: "Durum",
    statusText:
      "İzleyici erişimi HB Real Estate web sitesi üzerinden yönlendirilir; yönetici ve danışman alanları rol bazlı erişimin arkasında tutulur.",
  },
  home: {
    badge: "Premium mülk video turları",
    title: "HB Property Reels",
    subtitle:
      "HB Real Estate için lüks bir mülk video tur platformu; mobil öncelikli keşif, alıcı niyeti ve danışman takibi için tasarlandı.",
    viewReels: "Mülk videolarını gör",
    metricsReelsLabel: "Mülk videoları",
    metricsReelsDetail: "Yayınlanan videolar",
    metricsPropertiesLabel: "Mülkler",
    metricsPropertiesDetail: "Envanterde",
    metricsAgentsLabel: "Premium danışmanlar",
    metricsAgentsValue: "25+",
    metricsAgentsDetail: "Platformda",
    featuredEyebrow: "Öne çıkan video",
    featuredTitle:
      "Alıcılara her premium ayrıntıyı dikey bir video turunda gösterin.",
    featuredText:
      "HB Property Reels, danışmanlara yüklenen telefon videoları, alıcı soruları, mülk öne çıkanları ve takip talebi için cilalı bir vitrin sunar.",
    featurePoint1: "Uzaktaki alıcılar için TikTok tarzı mülk izleme deneyimi.",
    featurePoint2: "Lüks gayrimenkul envanteri için mülk öncelikli tasarım.",
    browseReels: "Mülk videolarına göz at",
    signatureEyebrow: "İmza ilanlar",
    signatureTitle: "Video keşfine hazır seçkin evler.",
    watchPropertyReels: "Mülk videolarını izle",
    launchEyebrow: "Lansman için hazır",
    launchTitle: "HB Property Reels alıcı etkileşimine hazır.",
    launchText:
      "Danışmanlar panelden mülk videolarını yükler, ziyaretçiler cilalı dikey bir mülk video deneyiminde izler.",
  },
  reels: {
    eyebrow: "Mülk video turları",
    title: "Premium mülkleri dikey videoda izleyin.",
    subtitle:
      "Yüklenen HB Real Estate mülk videolarına göz atın; alıcı işlemleri, WhatsApp iletişimi, randevu talepleri, teklifler ve mülk ayrıntıları ile.",
    filters: "Filtreler",
    empty: "Henüz yayınlanmış mülk videosu yok.",
  },
  reelViewer: {
    details: "Ayrıntılar",
    contactAgent: "Danışmanla iletişime geç",
    bookViewing: "Randevu al",
    makeOffer: "Teklif ver",
    comments: "Yorumlar",
    like: "Beğen",
    liked: "Beğenildi",
    share: "Paylaş",
    offer: "Teklif",
    book: "Randevu",
    whatsapp: "WhatsApp",
    sendMessage: "Mesaj gönder",
    yourName: "Adınız",
    yourEmail: "E-postanız",
    yourPhone: "Telefonunuz",
    yourMessage: "Mesajınız",
    preferredDate: "Tercih edilen tarih",
    preferredTime: "Tercih edilen saat",
    offerAmount: "Teklif tutarı",
    notes: "Notlar",
    addComment: "Yorum ekle",
    writeComment: "Bir yorum yazın...",
    reply: "Yanıtla",
    noComments: "Henüz yorum yok. İlk yorumu siz yapın.",
    sending: "Gönderiliyor...",
    sent: "Gönderildi",
    bookingTitle: "Görüntüleme randevusu al",
    bookingSubtitle: "Bu mülkü görmek için tercih ettiğiniz zamanı paylaşın.",
    offerTitle: "Teklif gönder",
    offerSubtitle: "Bu mülk için teklifinizi danışmana iletin.",
    detailsTitle: "Mülk ayrıntıları",
    requiredField: "Bu alan zorunludur",
    thankYou: "Teşekkürler! En kısa sürede sizinle iletişime geçeceğiz.",
    backToReels: "Videolara dön",
    closeLabel: "Kapat",
    openComments: "Yorumları aç",
    shareReel: "Videoyu paylaş",
    makeOfferLabel: "Teklif ver",
    likeVideo: "Videoyu beğen",
    unlikeVideo: "Beğeniyi geri al",
    youAuthor: "Siz",
    yourConsultant: "Danışmanınız",
    dossierFallback:
      "Mülkün tüm dosyası için danışmanınızla iletişime geçin.",
    interestedWhatsapp: (title, location) =>
      `Merhaba, ${location} bölgesindeki ${title} ile ilgileniyorum.`,
    muteVideo: "Sesi kapat",
    unmuteVideo: "Sesi aç",
    processingReel: "Video işleniyor…",
    couldNotLoadVideo: "Video yüklenemedi",
    guest: "Misafir",
    officialAgent: "Resmi Danışman",
    writeCommentAria: "Yorum yaz",
    addCommentPlaceholder: "Bir yorum ekleyin...",
    postCommentAria: "Yorumu gönder",
    couldNotPostComment: "Yorum gönderilemedi. Lütfen tekrar deneyin.",
    networkErrorRetry: "Ağ hatası. Lütfen tekrar deneyin.",
    commentsCount: (count) => `Yorumlar (${count})`,
    closeComments: "Yorumları kapat",
    beFirstToComment: "İlk yorumu siz yapın.",
    viewReplies: (count) => `${count} yanıtı görüntüle`,
    hideReplies: "Yanıtları gizle",
    replyPlaceholder: "Bir yanıt yazın...",
    sendReply: "Yanıt gönder",
    justNow: "az önce",
    couldNotLoadComments: "Yorumlar yüklenemedi.",
    newest: "En yeni",
    mostLiked: "En beğenilen",
    beFirstOnReel: "Bu mülk videosuna ilk yorumu siz yapın.",
    replyTo: (author) => `${author} kişisine yanıt veriliyor`,
    replyAction: "Yanıtla",
    addReplyPlaceholder: "Bir yanıt ekleyin...",
    writeReplyAria: "Yanıt yaz",
    postReplyAria: "Yanıtı gönder",
    viewReply: "1 yanıtı görüntüle",
    sendingComment: "Gönderiliyor...",
    minutesAgo: (n) => `${n} dk`,
    hoursAgo: (n) => `${n} sa`,
    daysAgo: (n) => `${n} g`,
    pinned: "Sabitlendi",
    likesCount: (n) => `${n} beğeni`,
    repliesPlural: (n) => `${n} yanıtı görüntüle`,
  },
  agentDashboard: {
    eyebrow: "Danışman paneli",
    title: "Mülk videoları kontrol merkezi",
    subtitle:
      "Mülk videolarını yükleyin, videoları alıcılara yayınlayın ve beğenileri, yorumları ve teklifleri tek bir çalışma alanından takip edin.",
    reelsInLibrary: (count) => `Kütüphanede ${count} video`,
    overviewLabel: "Mülk videoları analizi",
    notAuthorized: "Yetkiniz yok",
    notAuthorizedText: "Bu panele erişim yetkiniz bulunmuyor.",
    totalReels: "Toplam video",
    totalReelsDetail: (published, draft) =>
      `${published} yayında · ${draft} taslak`,
    reelViews: "Video görüntülenmeleri",
    reelViewsDetail: "Tüm videolarda",
    likes: "Beğeniler",
    likesDetail: "Alıcı tepkileri",
    comments: "Yorumlar",
    commentsDetail: "Konuşma hacmi",
    offers: "Teklifler",
    offersTracked: "Takip edilen teklifler",
    noOffersYet: "Henüz teklif yok",
    propertyReelsEyebrow: "Mülk videoları",
    reelPerformance: "Video performansı",
    colReel: "Video",
    colStatus: "Durum",
    colViews: "Görüntülenme",
    colLikes: "Beğeni",
    colComments: "Yorum",
    colOffers: "Teklif",
    colSize: "Boyut",
    colUploaded: "Yüklenme",
    colActions: "İşlemler",
    noReelsRow:
      "Henüz mülk videosu yok — başlamak için yukarıdan bir tane yükleyin.",
    propertiesEyebrow: "Mülkler",
    activeInventory: "Aktif envanter",
    propertiesHint:
      "Silme işlemi mülkü, bağlı videoları ve depolanan medyayı kaldırır.",
    latestReel: (status, date) => `Son video · ${status} · ${date}`,
    reelsCount: (count) => `${count} video`,
    consultantLabel: (name) => `Danışman: ${name}`,
    noPropertiesDb: "Veritabanında henüz mülk yok.",
    engagementEyebrow: "Etkileşim",
    likesAndComments: (count) => `Beğeniler ve yorumlar (${count})`,
    latestReelLabel: "Son video",
    likesBadge: (count) => `${count} beğeni`,
    commentsBadge: (count) => `${count} yorum`,
    signedInBuyer: "Giriş yapmış alıcı",
    guest: "Misafir",
    noCommentsYet: "Henüz yorum yok.",
    noLikesYet: "Henüz beğeni yok.",
    noEngagementYet: "Henüz beğeni veya yorum yok.",
    offersEyebrow: "Teklifler",
    offersFromReels: "Videolardan gelen teklifler",
    colProperty: "Mülk",
    colOfferAmount: "Teklif tutarı",
    colBuyer: "Alıcı",
    colPhone: "Telefon",
    noOffersRow: "Henüz mülk videolarından teklif yok.",
    refreshDashboard: "Paneli yenile",
    refreshHint: " ile en son teklif etkinliğini görüntüleyin.",
    unknownViewer: "Bilinmeyen izleyici",
    noActivity: "Etkinlik yok",
    statusLabels: {
      published: "yayında",
      draft: "taslak",
      processing: "işleniyor",
      archived: "arşivlendi",
      pending: "beklemede",
      accepted: "kabul edildi",
      countered: "karşı teklif",
      rejected: "reddedildi",
      "under review": "inceleniyor",
    },
    deleteConfirm: "Silmek istediğinizden emin misiniz?",
    clearEngagement: "Etkileşimi temizle",
    clearEngagementConfirm:
      "Bu mülke ait tüm beğeni ve yorumları temizlemek istiyor musunuz?",
    selectProperty: "Mülk seçin",
    videoFile: "Video dosyası",
    chooseFile: "Dosya seç",
    uploading: "Yükleniyor...",
    saving: "Kaydediliyor...",
  },
  admin: {
    eyebrow: "Yönetici paneli",
    title: "Platform sahibi genel bakışı",
    subtitle:
      "Veritabanınızdan gelen verilerle danışmanları, mülk videolarını, talep akışını ve performansı izleyin.",
    kpisLabel: "Platform KPI'ları",
    totalAgents: "Toplam danışman",
    activeCount: (count) => `${count} aktif`,
    totalReels: "Toplam mülk videosu",
    publishedCount: (count) => `${count} yayında`,
    totalLeads: "Toplam talep",
    fromAllReels: "Tüm videolardan",
    avgViews: "Video başına ortalama görüntülenme",
    acrossAllReels: "Tüm videolarda",
    agentsEyebrow: "Danışmanlar",
    agentAccounts: "Danışman hesapları",
    colAgentName: "Danışman adı",
    colCompany: "Şirket",
    colStatus: "Durum",
    colPlan: "Plan",
    colTotalLeads: "Toplam talep",
    noAgents: "Henüz danışman yok.",
    reelsEyebrow: "Videolar",
    topPerformers: "En iyi performans gösterenler",
    leadsAndAgent: (leads, agent) => `${leads} talep • ${agent}`,
    noReels: "Henüz mülk videosu yok.",
    propertyReelsEyebrow: "Mülk videoları",
    allReels: "Tüm videolar",
    colTitle: "Başlık",
    colAgent: "Danışman",
    colViews: "Görüntülenme",
    colLeads: "Talepler",
    statusLabels: {
      active: "aktif",
      ended: "sona erdi",
      paused: "duraklatıldı",
      pending: "beklemede",
      published: "yayında",
      draft: "taslak",
    },
  },
  live: {
    title: "Canlı yayınlar",
    subtitle: "Devam eden mülk canlı yayınlarına katılın.",
    startLive: "Canlı yayın başlat",
    joinLive: "Yayına katıl",
    liveNow: "Şimdi canlı",
    noLiveSessions: "Şu anda aktif canlı yayın yok.",
    replay: "Tekrar izle",
    viewers: "izleyici",
  },
  notFound: {
    title: "Sayfa bulunamadı",
    text: "Aradığınız sayfa mevcut değil veya taşınmış olabilir.",
    backHome: "Ana sayfaya dön",
  },
  uploadPanel: {
    addPropertyEyebrow: "Mülk ekle",
    uploadReelEyebrow: "Video yükle",
    addPropertyTitle: "Yeni bir mülk ilanı oluştur",
    uploadReelTitle: "Mülk videosu yükle",
    addPropertyDesc:
      "Proje adını, konumu, fiyatı ve bir kapak fotoğrafı belirleyin. Kapak, mülk videosu kartlarında küçük resim olarak kullanılır.",
    uploadReelDesc:
      "Bir mülk ilanına yeni bir dikey video ekleyin. MP4, MOV veya WebM.",
    tabAddProperty: "Mülk ekle",
    tabUploadReel: "Video yükle",
    propertyField: "Mülk",
    selectProperty: "Bir mülk seçin",
    noPropertiesOption:
      "Mülk yok — Mülk ekle sekmesinden bir tane oluşturun",
    reelTitleField: "Video başlığı",
    reelTitlePlaceholder: "Gün batımı çatı katı — 30 sn tur",
    videoFileField: "Video dosyası",
    descriptionOptional: "Açıklama (isteğe bağlı)",
    descriptionPlaceholder:
      "Özellikleri, semt notlarını veya alıcıların görmesi gereken vurguları belirtin.",
    uploadingPercent: (percent) => `Yükleniyor… %${percent}`,
    uploadReelButton: "Video yükle",
    addPropertyFirstHint:
      "Video yüklemeyi etkinleştirmek için önce bir mülk ekleyin.",
    chooseVideoFile: "Yüklemek için bir video dosyası seçin.",
    choosePropertyForReel: "Bu video için bir mülk seçin.",
    enterReelTitle: "Bir video başlığı girin.",
    couldNotUpload: "Mülk videosu yüklenemedi.",
    reelUploaded: (title) => `Video yüklendi — "${title}"`,
    reelPublishedNote:
      "Mülk videolarına yayınlandı. Artık alıcılar tarafından görülebilir.",
    uploadSavedRegFailed: (status) =>
      `Yükleme kaydedildi ancak kayıt başarısız oldu (durum ${status}).`,
  },
  addPropertyForm: {
    projectName: "Proje adı",
    projectNamePlaceholder: "örn. Boğaz Sky Residence",
    location: "Konum",
    locationPlaceholder: "İstanbul, Beşiktaş",
    price: "Fiyat",
    pricePlaceholder: "1250000",
    currency: "Para birimi",
    bedrooms: "Yatak odası",
    bathrooms: "Banyo",
    areaSqm: "Alan (m²)",
    consultant: "Danışman",
    useAccountConsultant: "Hesap danışmanını kullan",
    consultantHint:
      "Seçilen danışman ana mülk videosunda ve iletişim işlemlerinde görünür.",
    coverImage: "Kapak görseli",
    coverImageHint:
      "Mülk videosu kartında küçük resim olarak kullanılır. JPEG, PNG, WebP veya AVIF, 10 MB'a kadar.",
    coverPreviewAlt: "Kapak önizlemesi",
    description: "Açıklama",
    descriptionPlaceholder:
      "Projeyi, semti, malzemeleri veya alıcıların bilmesi gereken olanakları belirtin.",
    saving: (percent) => `Kaydediliyor… %${percent}`,
    submit: "Mülkü kaydet",
    coverNote:
      "Kapak görseli Vercel Blob'a yüklenir ve video küçük resmi olarak kullanılır.",
    chooseCoverImage: "Mülk için bir kapak görseli seçin.",
    couldNotSave: "Mülk kaydedilemedi.",
    propertySaved: (title) => `Mülk kaydedildi — "${title}"`,
    propertySavedNote: (location) =>
      `${location}. Artık "Video yükle" sekmesinden bu mülk için video yükleyebilirsiniz.`,
    networkErrorSaving: "Mülk kaydedilirken ağ hatası oluştu.",
    saveCancelled: "Kayıt iptal edildi.",
    saveFailed: (status) => `Kayıt başarısız oldu (durum ${status}).`,
  },
  bookingSheet: {
    title: "Randevu al",
    requestSent: "Görüntüleme talebi gönderildi",
    requestSentSub: "Danışman randevuyu en kısa sürede onaylayacak.",
    selectDate: "Tarih seçin",
    selectTime: "Saat seçin",
    fullName: "Ad soyad",
    phone: "Telefon",
    budget: "Bütçe",
    budgetPlaceholder: "Örnek: 450.000 USD",
    messageOptional: "Mesaj (isteğe bağlı)",
    sending: "Gönderiliyor...",
    submit: "Randevu al",
    couldNotBook: "Randevu oluşturulamadı.",
  },
  offerSheet: {
    title: "Teklif ver",
    offerSent: "Teklif gönderildi",
    offerSentSub: "Danışman teklifinizle ilgili sizinle iletişime geçecek.",
    propertyAsking: "İstenen fiyat",
    yourOffer: "Teklifiniz",
    offerAmountPlaceholder: "Teklif tutarınızı girin",
    fullName: "Ad soyad",
    phone: "Telefon",
    messageOptional: "Mesaj (isteğe bağlı)",
    sending: "Gönderiliyor...",
    submit: "Teklifi gönder",
    couldNotSubmit: "Teklif gönderilemedi.",
  },
  components: {
    processing: "İşleniyor...",
    closeDialog: "Pencereyi kapat",
    deleteAction: "Sil",
    deletePropertyTitle: "Mülkü sil",
    deletePropertyDesc: (title, reelCount) =>
      `Bu işlem "${title}" mülkünü web sitesinden ve veritabanından kalıcı olarak kaldırır${
        reelCount > 0 ? `, bağlı ${reelCount} video dahil` : ""
      }. Bu işlem geri alınamaz.`,
    couldNotDeleteProperty: "Mülk silinemedi.",
    deleteAria: (title) => `${title} öğesini sil`,
    deleteAll: "Tümünü sil",
    deleteAllTitle: "Tüm beğeni ve yorumları sil",
    deleteAllDesc:
      "Bu işlem veritabanındaki her video ve canlı beğeni/yorumu kalıcı olarak siler ve video beğeni/yorum sayaçlarını sıfırlar.",
    couldNotDeleteEngagement: "Beğeni ve yorumlar silinemedi.",
    watch: "İzle",
    updating: "Güncelleniyor…",
    unpublish: "Yayından kaldır",
    publish: "Yayınla",
    edit: "Düzenle",
    couldNotUpdateStatus: "Video durumu güncellenemedi.",
    couldNotDeleteReel: "Video silinemedi.",
    deleteReelTitle: "Mülk videosunu sil",
    deleteReelDesc: (title) =>
      `Bu işlem "${title}" videosunu ve video dosyasını kalıcı olarak kaldırır. Bu işlem geri alınamaz.`,
    editReelTitle: "Videoyu düzenle",
    editReelSubtitle: "Alıcılara gösterilen başlığı veya açıklamayı güncelleyin.",
    titleField: "Başlık",
    descriptionField: "Açıklama",
    couldNotSaveReel: "Video kaydedilemedi.",
    saving: "Kaydediliyor…",
    saveChanges: "Değişiklikleri kaydet",
    networkError: "Ağ hatası.",
    requestFailed: (status) => `İstek başarısız oldu (${status}).`,
    deleteFailed: (status) => `Silme başarısız oldu (${status}).`,
  },
};

const en: Dictionary = {
  common: {
    home: "Home",
    propertyReels: "Property reels",
    watchReels: "Watch reels",
    agentUploads: "Agent uploads",
    agentDashboard: "Agent dashboard",
    backToHome: "Back to home",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    submit: "Submit",
    delete: "Delete",
    edit: "Edit",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    language: "Language",
    viewsLabel: (count) => `${count} views`,
    presentedBy: (agent) => `Presented by ${agent}`,
    priceOnRequest: "Price on request",
    propertyReelBadge: "Property reel",
    watchReel: "Watch reel",
  },
  nav: {
    home: "Home",
    propertyReels: "Property reels",
  },
  footer: {
    brand: "HB Real Estate",
    tagline:
      "Vertical property video tours for premium listings, private viewings, and high-intent buyer discovery.",
    platform: "Platform",
    propertyReels: "Property reels",
    status: "Status",
    statusText:
      "Viewer access is routed through the HB Real Estate website, with admin and agent areas kept behind role-based access.",
  },
  home: {
    badge: "Premium property video tours",
    title: "HB Property Reels",
    subtitle:
      "A luxury property video tour platform for HB Real Estate, built for mobile-first discovery, buyer intent, and agent follow-up.",
    viewReels: "View property reels",
    metricsReelsLabel: "Property reels",
    metricsReelsDetail: "Published videos",
    metricsPropertiesLabel: "Properties",
    metricsPropertiesDetail: "In inventory",
    metricsAgentsLabel: "Premium agents",
    metricsAgentsValue: "25+",
    metricsAgentsDetail: "On platform",
    featuredEyebrow: "Featured reel",
    featuredTitle:
      "Show buyers every premium detail in a vertical video tour.",
    featuredText:
      "HB Property Reels gives agents a polished front door for uploaded phone videos, buyer questions, property highlights, and follow-up demand.",
    featurePoint1: "TikTok-style property viewing experience for remote buyers.",
    featurePoint2: "Property-first design for luxury real estate inventory.",
    browseReels: "Browse property reels",
    signatureEyebrow: "Signature listings",
    signatureTitle: "Curated homes ready for video discovery.",
    watchPropertyReels: "Watch property reels",
    launchEyebrow: "Built for launch",
    launchTitle: "HB Property Reels is ready for buyer engagement.",
    launchText:
      "Agents upload property videos from the dashboard, and visitors watch in a polished vertical property reels experience.",
  },
  reels: {
    eyebrow: "Property video tours",
    title: "Watch premium properties in vertical video.",
    subtitle:
      "Browse uploaded HB Real Estate property reels with buyer actions, WhatsApp contact, booking requests, offers, and property details.",
    filters: "Filters",
    empty: "No published property reels yet.",
  },
  reelViewer: {
    details: "Details",
    contactAgent: "Contact agent",
    bookViewing: "Book viewing",
    makeOffer: "Make offer",
    comments: "Comments",
    like: "Like",
    liked: "Liked",
    share: "Share",
    offer: "Offer",
    book: "Book",
    whatsapp: "WhatsApp",
    sendMessage: "Send message",
    yourName: "Your name",
    yourEmail: "Your email",
    yourPhone: "Your phone",
    yourMessage: "Your message",
    preferredDate: "Preferred date",
    preferredTime: "Preferred time",
    offerAmount: "Offer amount",
    notes: "Notes",
    addComment: "Add comment",
    writeComment: "Write a comment...",
    reply: "Reply",
    noComments: "No comments yet. Be the first to comment.",
    sending: "Sending...",
    sent: "Sent",
    bookingTitle: "Book a viewing",
    bookingSubtitle: "Share your preferred time to see this property.",
    offerTitle: "Submit an offer",
    offerSubtitle: "Send your offer for this property to the agent.",
    detailsTitle: "Property details",
    requiredField: "This field is required",
    thankYou: "Thank you! We will get back to you shortly.",
    backToReels: "Back to reels",
    closeLabel: "Close",
    openComments: "Open comments",
    shareReel: "Share reel",
    makeOfferLabel: "Make an offer",
    likeVideo: "Like video",
    unlikeVideo: "Unlike video",
    youAuthor: "You",
    yourConsultant: "Your consultant",
    dossierFallback:
      "Reach out to your consultant for the full property dossier.",
    interestedWhatsapp: (title, location) =>
      `Hi, I'm interested in ${title} in ${location}.`,
    muteVideo: "Mute video",
    unmuteVideo: "Unmute video",
    processingReel: "Processing reel…",
    couldNotLoadVideo: "Could not load video",
    guest: "Guest",
    officialAgent: "Official Agent",
    writeCommentAria: "Write a comment",
    addCommentPlaceholder: "Add a comment...",
    postCommentAria: "Post comment",
    couldNotPostComment: "Could not post comment. Please try again.",
    networkErrorRetry: "Network error. Please try again.",
    commentsCount: (count) => `Comments (${count})`,
    closeComments: "Close comments",
    beFirstToComment: "Be the first to comment.",
    viewReplies: (count) => `View ${count} replies`,
    hideReplies: "Hide replies",
    replyPlaceholder: "Write a reply...",
    sendReply: "Send reply",
    justNow: "just now",
    couldNotLoadComments: "Could not load comments.",
    newest: "Newest",
    mostLiked: "Most liked",
    beFirstOnReel: "Be the first to comment on this property reel.",
    replyTo: (author) => `Replying to ${author}`,
    replyAction: "Reply",
    addReplyPlaceholder: "Add a reply...",
    writeReplyAria: "Write a reply",
    postReplyAria: "Post reply",
    viewReply: "View 1 reply",
    sendingComment: "Sending...",
    minutesAgo: (n) => `${n}m`,
    hoursAgo: (n) => `${n}h`,
    daysAgo: (n) => `${n}d`,
    pinned: "Pinned",
    likesCount: (n) => `${n} likes`,
    repliesPlural: (n) => `View ${n} ${n === 1 ? "reply" : "replies"}`,
  },
  agentDashboard: {
    eyebrow: "Agent dashboard",
    title: "Property reels command center",
    subtitle:
      "Upload property videos, publish reels to buyers, and track likes, comments, and offers from a single workspace.",
    reelsInLibrary: (count) => `${count} reels in library`,
    overviewLabel: "Property reels analytics",
    notAuthorized: "Not authorized",
    notAuthorizedText: "You do not have access to this dashboard.",
    totalReels: "Total reels",
    totalReelsDetail: (published, draft) =>
      `${published} published · ${draft} draft`,
    reelViews: "Reel views",
    reelViewsDetail: "Across all reels",
    likes: "Likes",
    likesDetail: "Buyer reactions",
    comments: "Comments",
    commentsDetail: "Conversation volume",
    offers: "Offers",
    offersTracked: "Offers tracked",
    noOffersYet: "No offers yet",
    propertyReelsEyebrow: "Property reels",
    reelPerformance: "Reel performance",
    colReel: "Reel",
    colStatus: "Status",
    colViews: "Views",
    colLikes: "Likes",
    colComments: "Comments",
    colOffers: "Offers",
    colSize: "Size",
    colUploaded: "Uploaded",
    colActions: "Actions",
    noReelsRow: "No property reels yet — upload one above to get started.",
    propertiesEyebrow: "Properties",
    activeInventory: "Active inventory",
    propertiesHint:
      "Delete removes the property, linked reels, and stored media.",
    latestReel: (status, date) => `Latest reel · ${status} · ${date}`,
    reelsCount: (count) => `${count} reels`,
    consultantLabel: (name) => `Consultant: ${name}`,
    noPropertiesDb: "No properties in the database yet.",
    engagementEyebrow: "Engagement",
    likesAndComments: (count) => `Likes & comments (${count})`,
    latestReelLabel: "Latest reel",
    likesBadge: (count) => `${count} likes`,
    commentsBadge: (count) => `${count} comments`,
    signedInBuyer: "Signed-in buyer",
    guest: "Guest",
    noCommentsYet: "No comments yet.",
    noLikesYet: "No likes yet.",
    noEngagementYet: "No likes or comments yet.",
    offersEyebrow: "Offers",
    offersFromReels: "Offers from reels",
    colProperty: "Property",
    colOfferAmount: "Offer amount",
    colBuyer: "Buyer",
    colPhone: "Phone",
    noOffersRow: "No offers from property reels yet.",
    refreshDashboard: "Refresh dashboard",
    refreshHint: " to pull the latest offer activity.",
    unknownViewer: "Unknown viewer",
    noActivity: "No activity",
    statusLabels: {
      published: "published",
      draft: "draft",
      processing: "processing",
      archived: "archived",
      pending: "pending",
      accepted: "accepted",
      countered: "countered",
      rejected: "rejected",
      "under review": "under review",
    },
    deleteConfirm: "Are you sure you want to delete this?",
    clearEngagement: "Clear engagement",
    clearEngagementConfirm:
      "Do you want to clear all likes and comments for this property?",
    selectProperty: "Select property",
    videoFile: "Video file",
    chooseFile: "Choose file",
    uploading: "Uploading...",
    saving: "Saving...",
  },
  admin: {
    eyebrow: "Admin dashboard",
    title: "Platform owner overview",
    subtitle:
      "Monitor agents, property reels, lead flow, and performance with data from your database.",
    kpisLabel: "Platform KPIs",
    totalAgents: "Total agents",
    activeCount: (count) => `${count} active`,
    totalReels: "Total property reels",
    publishedCount: (count) => `${count} published`,
    totalLeads: "Total leads",
    fromAllReels: "From all reels",
    avgViews: "Avg views per reel",
    acrossAllReels: "Across all reels",
    agentsEyebrow: "Agents",
    agentAccounts: "Agent accounts",
    colAgentName: "Agent name",
    colCompany: "Company",
    colStatus: "Status",
    colPlan: "Plan",
    colTotalLeads: "Total leads",
    noAgents: "No agents yet.",
    reelsEyebrow: "Reels",
    topPerformers: "Top performers",
    leadsAndAgent: (leads, agent) => `${leads} leads • ${agent}`,
    noReels: "No property reels yet.",
    propertyReelsEyebrow: "Property reels",
    allReels: "All reels",
    colTitle: "Title",
    colAgent: "Agent",
    colViews: "Views",
    colLeads: "Leads",
    statusLabels: {
      active: "active",
      ended: "ended",
      paused: "paused",
      pending: "pending",
      published: "published",
      draft: "draft",
    },
  },
  live: {
    title: "Live sessions",
    subtitle: "Join ongoing property live streams.",
    startLive: "Start live",
    joinLive: "Join live",
    liveNow: "Live now",
    noLiveSessions: "No active live sessions right now.",
    replay: "Replay",
    viewers: "viewers",
  },
  notFound: {
    title: "Page not found",
    text: "The page you are looking for does not exist or has been moved.",
    backHome: "Back to home",
  },
  uploadPanel: {
    addPropertyEyebrow: "Add property",
    uploadReelEyebrow: "Upload reel",
    addPropertyTitle: "Create a new property listing",
    uploadReelTitle: "Upload property reel",
    addPropertyDesc:
      "Set the project name, location, price, and a cover photo. The cover is used as the thumbnail on Property reel cards.",
    uploadReelDesc:
      "Add a new vertical video to a property listing. MP4, MOV, or WebM.",
    tabAddProperty: "Add property",
    tabUploadReel: "Upload reel",
    propertyField: "Property",
    selectProperty: "Select a property",
    noPropertiesOption:
      "No properties available — create one in the Add property tab",
    reelTitleField: "Reel title",
    reelTitlePlaceholder: "Sunset penthouse — 30s tour",
    videoFileField: "Video file",
    descriptionOptional: "Description (optional)",
    descriptionPlaceholder:
      "Highlight features, neighborhood notes, or callouts buyers should see.",
    uploadingPercent: (percent) => `Uploading… ${percent}%`,
    uploadReelButton: "Upload reel",
    addPropertyFirstHint: "Add a property first to enable reel uploads.",
    chooseVideoFile: "Choose a video file to upload.",
    choosePropertyForReel: "Choose a property for this reel.",
    enterReelTitle: "Enter a reel title.",
    couldNotUpload: "Could not upload property reel.",
    reelUploaded: (title) => `Reel uploaded — "${title}"`,
    reelPublishedNote:
      "Published to Property reels. It is now visible to buyers.",
    uploadSavedRegFailed: (status) =>
      `Upload saved, but registration failed (status ${status}).`,
  },
  addPropertyForm: {
    projectName: "Project name",
    projectNamePlaceholder: "e.g. Bosphorus Sky Residence",
    location: "Location",
    locationPlaceholder: "Istanbul, Beşiktaş",
    price: "Price",
    pricePlaceholder: "1250000",
    currency: "Currency",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    areaSqm: "Area (m²)",
    consultant: "Consultant",
    useAccountConsultant: "Use account consultant",
    consultantHint:
      "Selected consultant appears on the main property reel and contact actions.",
    coverImage: "Cover image",
    coverImageHint:
      "Used as the thumbnail on the Property reel card. JPEG, PNG, WebP, or AVIF, up to 10 MB.",
    coverPreviewAlt: "Cover preview",
    description: "Description",
    descriptionPlaceholder:
      "Highlight the project, neighborhood, finishes, or amenities buyers should know about.",
    saving: (percent) => `Saving… ${percent}%`,
    submit: "Save property",
    coverNote:
      "Cover image is uploaded to Vercel Blob and used as the reel thumbnail.",
    chooseCoverImage: "Choose a cover image for the property.",
    couldNotSave: "Could not save property.",
    propertySaved: (title) => `Property saved — "${title}"`,
    propertySavedNote: (location) =>
      `${location}. You can now upload reels for this property from the "Upload reel" tab.`,
    networkErrorSaving: "Network error while saving property.",
    saveCancelled: "Save was cancelled.",
    saveFailed: (status) => `Save failed (status ${status}).`,
  },
  bookingSheet: {
    title: "Book viewing",
    requestSent: "Viewing request sent",
    requestSentSub: "The consultant will confirm the appointment shortly.",
    selectDate: "Select date",
    selectTime: "Select time",
    fullName: "Full name",
    phone: "Phone",
    budget: "Budget",
    budgetPlaceholder: "Example: 450,000 USD",
    messageOptional: "Message (optional)",
    sending: "Sending...",
    submit: "Book viewing",
    couldNotBook: "Could not book viewing.",
  },
  offerSheet: {
    title: "Make offer",
    offerSent: "Offer sent",
    offerSentSub: "The consultant will get in touch about your offer.",
    propertyAsking: "Asking price",
    yourOffer: "Your offer",
    offerAmountPlaceholder: "Enter your offer amount",
    fullName: "Full name",
    phone: "Phone",
    messageOptional: "Message (optional)",
    sending: "Sending...",
    submit: "Submit offer",
    couldNotSubmit: "Could not submit offer.",
  },
  components: {
    processing: "Processing...",
    closeDialog: "Close dialog",
    deleteAction: "Delete",
    deletePropertyTitle: "Delete property",
    deletePropertyDesc: (title, reelCount) =>
      `This permanently removes "${title}" from the website and database${
        reelCount > 0
          ? `, including ${reelCount} linked reel${reelCount === 1 ? "" : "s"}`
          : ""
      }. This action cannot be undone.`,
    couldNotDeleteProperty: "Could not delete property.",
    deleteAria: (title) => `Delete ${title}`,
    deleteAll: "Delete all",
    deleteAllTitle: "Delete all likes and comments",
    deleteAllDesc:
      "This permanently deletes every reel and live like/comment from the database and resets reel like/comment counters to zero.",
    couldNotDeleteEngagement: "Could not delete likes and comments.",
    watch: "Watch",
    updating: "Updating…",
    unpublish: "Unpublish",
    publish: "Publish",
    edit: "Edit",
    couldNotUpdateStatus: "Could not update reel status.",
    couldNotDeleteReel: "Could not delete reel.",
    deleteReelTitle: "Delete property reel",
    deleteReelDesc: (title) =>
      `This will permanently remove "${title}" and its video file. This action cannot be undone.`,
    editReelTitle: "Edit reel",
    editReelSubtitle: "Update the title or description shown to buyers.",
    titleField: "Title",
    descriptionField: "Description",
    couldNotSaveReel: "Could not save reel.",
    saving: "Saving…",
    saveChanges: "Save changes",
    networkError: "Network error.",
    requestFailed: (status) => `Request failed (${status}).`,
    deleteFailed: (status) => `Delete failed (${status}).`,
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { tr, en };

export type { Dictionary };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.tr;
}
