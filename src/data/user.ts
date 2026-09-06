export const userTeachers = [
  { slug: "buddha", name: "Buddha", initials: "BU", tradition: "Buddhism", specialty: "Mindfulness & freedom from attachment", description: "Explore the nature of suffering, awareness, compassion, and the middle path through grounded dialogue.", color: "amber", chats: "8.4K" },
  { slug: "osho", name: "Osho", initials: "OS", tradition: "Modern Mysticism", specialty: "Meditation & conscious living", description: "Question convention and investigate awareness, love, celebration, and meditation in everyday life.", color: "indigo", chats: "7.8K" },
  { slug: "rumi", name: "Rumi", initials: "RU", tradition: "Sufism", specialty: "Love, surrender & the soul", description: "Enter a poetic conversation about longing, divine love, surrender, and the journey toward the beloved.", color: "rose", chats: "6.2K" },
  { slug: "guru-nanak", name: "Guru Nanak", initials: "GN", tradition: "Sikhism", specialty: "Truthful living & service", description: "Reflect on oneness, honest work, remembrance, equality, and selfless service.", color: "blue", chats: "5.9K" },
  { slug: "kabir", name: "Kabir", initials: "KA", tradition: "Bhakti", specialty: "The inner path & simplicity", description: "Look beyond ritual and identity toward direct experience, simplicity, and the divine within.", color: "orange", chats: "4.8K" },
  { slug: "socrates", name: "Socrates", initials: "SO", tradition: "Greek Philosophy", specialty: "Inquiry & self-knowledge", description: "Examine beliefs through careful questions and cultivate an honest, thoughtful, and ethical life.", color: "slate", chats: "3.6K" },
  { slug: "plato", name: "Plato", initials: "PL", tradition: "Greek Philosophy", specialty: "Truth, virtue & reality", description: "Consider virtue, justice, beauty, knowledge, and what lies beyond appearances.", color: "violet", chats: "3.1K" },
  { slug: "spinoza", name: "Baruch Spinoza", initials: "BS", tradition: "Rational Mysticism", specialty: "Freedom through understanding", description: "Explore emotion, reason, nature, and the freedom that comes from deeper understanding.", color: "green", chats: "2.9K" },
  { slug: "adi-shankaracharya", name: "Adi Shankaracharya", initials: "AS", tradition: "Advaita Vedanta", specialty: "Non-duality & self-realisation", description: "Investigate the self, awareness, maya, and the non-dual nature of ultimate reality.", color: "saffron", chats: "5.2K" },
  { slug: "vivekananda", name: "Swami Vivekananda", initials: "SV", tradition: "Vedanta", specialty: "Strength & practical spirituality", description: "Bring courage, service, discipline, and the practical wisdom of Vedanta into modern life.", color: "navy", chats: "5.6K" },
] as const;

export const userConversations = [
  { id: "peace", teacher: "Buddha", teacherSlug: "buddha", title: "Finding peace within", preview: "How can I observe thoughts without...", time: "12 min", group: "Today" },
  { id: "love", teacher: "Rumi", teacherSlug: "rumi", title: "Love and surrender", preview: "What does surrender really mean?", time: "2 hr", group: "Today" },
  { id: "karma", teacher: "Guru Nanak", teacherSlug: "guru-nanak", title: "Karma and honest work", preview: "How do intention and action meet?", time: "Yesterday", group: "Yesterday" },
  { id: "anger", teacher: "Osho", teacherSlug: "osho", title: "Understanding anger", preview: "Can anger be transformed into...", time: "Tue", group: "Previous 7 days" },
  { id: "purpose", teacher: "Vivekananda", teacherSlug: "vivekananda", title: "Courage and purpose", preview: "How do I find strength when...", time: "Mon", group: "Previous 7 days" },
] as const;

export const userPayments = [
  { invoice: "C2I-2047", plan: "Seeker monthly", date: "03 Sep 2026", amount: "₹499", method: "Visa •••• 4242", status: "Paid" },
  { invoice: "C2I-1894", plan: "Seeker monthly", date: "03 Aug 2026", amount: "₹499", method: "Visa •••• 4242", status: "Paid" },
  { invoice: "C2I-1721", plan: "Seeker monthly", date: "03 Jul 2026", amount: "₹499", method: "UPI", status: "Paid" },
] as const;
