import Link from "next/link";
import { articles, teachers } from "@/data/site";

export function Footer() {
  return <footer className="site-footer pt-5"><div className="container"><div className="row g-4">
    <div className="col-lg-4"><Link href="/" className="navbar-brand-wrap d-inline-flex mb-3"><span className="brand-mark">ॐ</span><span className="brand-text"><span className="brand-name d-block" style={{ color: "var(--gold-light)" }}>connect2infinity</span><span className="brand-tagline">Parmatma Realization</span></span></Link><p>connect2infinity is a free knowledge space for Parmatma realisation — the lives and teachings of the world&apos;s great spiritual masters and philosophers, and clear guides to meditation, self-realisation and life purpose.</p><div className="footer-social mt-3"><a href="#" aria-label="Facebook"><i className="bi bi-facebook" /></a><a href="#" aria-label="Instagram"><i className="bi bi-instagram" /></a><a href="#" aria-label="YouTube"><i className="bi bi-youtube" /></a></div></div>
    <div className="col-lg-2 col-6"><h5>Quick Links</h5><ul className="list-unstyled d-grid gap-2 mt-3"><li><Link href="/">Home</Link></li><li><Link href="/about">About Us</Link></li><li><Link href="/teachers">Teachers</Link></li><li><Link href="/articles">Articles</Link></li><li><Link href="/contact">Contact Us</Link></li></ul></div>
    <div className="col-lg-3 col-6"><h5>Teachers</h5><ul className="list-unstyled d-grid gap-2 mt-3">{teachers.slice(0, 6).map((teacher) => <li key={teacher.slug}><Link href={`/teachers/${teacher.slug}`}>{teacher.name}</Link></li>)}</ul></div>
    <div className="col-lg-3"><h5>Articles</h5><ul className="list-unstyled d-grid gap-2 mt-3">{articles.map((article) => <li key={article.slug}><Link href={`/articles/${article.slug}`}>{article.name}</Link></li>)}</ul></div>
  </div><div className="footer-bottom text-center py-3 mt-4">© {new Date().getFullYear()} connect2infinity.ai. All Rights Reserved.</div></div></footer>;
}
