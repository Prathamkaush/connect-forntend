export const adminUsers = [
  { name: "Aarav Sharma", email: "aarav.sharma@example.com", plan: "Wisdom Plus", questions: 184, joined: "28 Aug 2026", status: "Active", initials: "AS" },
  { name: "Meera Iyer", email: "meera.iyer@example.com", plan: "Seeker", questions: 72, joined: "27 Aug 2026", status: "Active", initials: "MI" },
  { name: "Rohan Verma", email: "rohan.verma@example.com", plan: "Free", questions: 18, joined: "25 Aug 2026", status: "Trial", initials: "RV" },
  { name: "Ananya Das", email: "ananya.das@example.com", plan: "Wisdom Plus", questions: 236, joined: "21 Aug 2026", status: "Active", initials: "AD" },
  { name: "Kabir Mehta", email: "kabir.mehta@example.com", plan: "Seeker", questions: 91, joined: "19 Aug 2026", status: "Paused", initials: "KM" },
  { name: "Nisha Kapoor", email: "nisha.kapoor@example.com", plan: "Free", questions: 9, joined: "17 Aug 2026", status: "Trial", initials: "NK" },
];

export const adminTeachers = [
  { name: "Buddha", tradition: "Buddhism", chats: "8,492", articles: 12, prompt: "Published", status: "Active", initials: "BU" },
  { name: "Osho", tradition: "Modern Mysticism", chats: "7,831", articles: 9, prompt: "Published", status: "Active", initials: "OS" },
  { name: "Rumi", tradition: "Sufism", chats: "6,214", articles: 8, prompt: "Published", status: "Active", initials: "RU" },
  { name: "Guru Nanak", tradition: "Sikhism", chats: "5,903", articles: 11, prompt: "Draft", status: "Active", initials: "GN" },
  { name: "Kabir", tradition: "Bhakti", chats: "4,875", articles: 7, prompt: "Published", status: "Active", initials: "KA" },
  { name: "Socrates", tradition: "Greek Philosophy", chats: "3,642", articles: 6, prompt: "Review", status: "Hidden", initials: "SO" },
];

export const adminArticles = [
  { title: "What is Parmatma?", category: "Foundations", author: "Editorial Team", updated: "Today, 10:24", views: "12.4K", seo: 94, status: "Published" },
  { title: "The Stillness Toolkit", category: "Meditation", author: "Meera Iyer", updated: "Yesterday", views: "9.8K", seo: 89, status: "Published" },
  { title: "Finding Your Life Purpose", category: "Life Purpose", author: "Editorial Team", updated: "29 Aug 2026", views: "8.1K", seo: 91, status: "Published" },
  { title: "Self-Realisation", category: "Foundations", author: "Aarav Sharma", updated: "27 Aug 2026", views: "7.3K", seo: 86, status: "Published" },
  { title: "Five Lessons from Kabir", category: "Teachers", author: "Editorial Team", updated: "26 Aug 2026", views: "—", seo: 78, status: "Draft" },
];

export const adminPayments = [
  { invoice: "C2I-2048", customer: "Ananya Das", amount: "₹1,499", date: "03 Sep 2026", method: "UPI", status: "Paid" },
  { invoice: "C2I-2047", customer: "Aarav Sharma", amount: "₹1,499", date: "03 Sep 2026", method: "Card", status: "Paid" },
  { invoice: "C2I-2046", customer: "Kabir Mehta", amount: "₹499", date: "02 Sep 2026", method: "UPI", status: "Pending" },
  { invoice: "C2I-2045", customer: "Meera Iyer", amount: "₹499", date: "02 Sep 2026", method: "Card", status: "Paid" },
  { invoice: "C2I-2044", customer: "Rohan Verma", amount: "₹1,499", date: "01 Sep 2026", method: "Net banking", status: "Refunded" },
];

export const adminChats = [
  { id: "CH-8194", user: "Aarav Sharma", teacher: "Buddha", topic: "Dealing with attachment", questions: 12, duration: "18m", time: "8 min ago", flag: "Healthy" },
  { id: "CH-8193", user: "Meera Iyer", teacher: "Rumi", topic: "Love and surrender", questions: 8, duration: "11m", time: "16 min ago", flag: "Healthy" },
  { id: "CH-8192", user: "Rohan Verma", teacher: "Osho", topic: "Meditation practice", questions: 15, duration: "24m", time: "31 min ago", flag: "Review" },
  { id: "CH-8191", user: "Nisha Kapoor", teacher: "Guru Nanak", topic: "Living truthfully", questions: 6, duration: "9m", time: "42 min ago", flag: "Healthy" },
  { id: "CH-8190", user: "Kabir Mehta", teacher: "Kabir", topic: "The inner temple", questions: 10, duration: "15m", time: "1 hr ago", flag: "Healthy" },
];

export const adminActivity = [
  { icon: "bi-person-plus", action: "New user account created", detail: "nisha.kapoor@example.com joined the Free plan", actor: "System", time: "12 min ago", tone: "orange" },
  { icon: "bi-pencil-square", action: "Article updated", detail: "Meera edited “The Stillness Toolkit”", actor: "Meera Iyer", time: "28 min ago", tone: "blue" },
  { icon: "bi-cpu", action: "AI prompt published", detail: "Buddha personality prompt v3.2 is now live", actor: "Admin", time: "1 hr ago", tone: "purple" },
  { icon: "bi-receipt", action: "Payment received", detail: "Invoice C2I-2048 paid successfully", actor: "System", time: "2 hrs ago", tone: "green" },
  { icon: "bi-shield-check", action: "Security settings changed", detail: "Two-factor authentication was enabled", actor: "Admin", time: "Yesterday", tone: "blue" },
  { icon: "bi-person-x", action: "User account paused", detail: "kabir.mehta@example.com was paused", actor: "Support", time: "Yesterday", tone: "red" },
];
