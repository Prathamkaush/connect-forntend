"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { articles, teachers } from "@/data/site";

type DropdownName = "teachers" | "articles";

export function Header() {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownName | null>(null);
  const active = (path: string) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));

  const closeNavigation = () => {
    setMobileNavigationOpen(false);
    setOpenDropdown(null);
  };

  const handleDropdownClick = (event: React.MouseEvent, dropdown: DropdownName) => {
    if (window.innerWidth < 992) {
      event.preventDefault();
      setOpenDropdown((current) => current === dropdown ? null : dropdown);
    }
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".nav-group")) {
        setOpenDropdown(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDropdown(null);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <>
    <div className="topbar d-none d-md-block"><div className="container d-flex justify-content-between align-items-center"><div><i className="bi bi-globe2" /> An online resource for Parmatma realisation — open anytime, anywhere</div><div><a href="mailto:connect@connect2infinity.ai"><i className="bi bi-envelope-fill" /> connect@connect2infinity.ai</a></div></div></div>
    <nav className="navbar navbar-expand-lg main-navbar sticky-top"><div className="container">
      <Link className="navbar-brand navbar-brand-wrap" href="/" onClick={closeNavigation}><span className="brand-mark">ॐ</span><span className="brand-text"><span className="brand-name d-block">connect2infinity</span><span className="brand-tagline">Parmatma Realization</span></span></Link>
      <button className="navbar-toggler" type="button" aria-label="Toggle navigation" aria-expanded={mobileNavigationOpen} onClick={() => setMobileNavigationOpen((value) => !value)}><span className="navbar-toggler-icon" /></button>
      <div className={`collapse navbar-collapse${mobileNavigationOpen ? " show" : ""}`}><ul className="navbar-nav mx-auto align-items-lg-center">
        <li className="nav-item"><Link className={`nav-link${active("/") ? " active" : ""}`} href="/" onClick={closeNavigation}>Home</Link></li>
        <li className="nav-item"><Link className={`nav-link${active("/about") ? " active" : ""}`} href="/about" onClick={closeNavigation}>About Us</Link></li>
        <li className="nav-item dropdown position-static nav-group" onMouseEnter={() => setOpenDropdown("teachers")}>
          <Link className={`nav-link dropdown-toggle${active("/teachers") ? " active" : ""}`} href="/teachers" aria-haspopup="true" aria-expanded={openDropdown === "teachers"} onFocus={() => setOpenDropdown("teachers")} onClick={(event) => handleDropdownClick(event, "teachers")}>Teachers</Link>
          <div className={`dropdown-menu mega-menu w-100${openDropdown === "teachers" ? " show" : ""}`}><div className="container"><div className="row g-4">{[teachers.slice(0, 5), teachers.slice(5)].map((group, index) => <div className="col-6" key={index}><div className="mega-col-title"><i className="bi bi-person-lines-fill me-1" />{index === 0 ? "Teachers A–K" : "Teachers K–V"}</div>{group.map((teacher) => <Link className="dropdown-item" href={`/teachers/${teacher.slug}`} key={teacher.slug} onClick={closeNavigation}>{teacher.name}</Link>)}</div>)}</div></div></div>
        </li>
        <li className="nav-item dropdown position-static nav-group" onMouseEnter={() => setOpenDropdown("articles")}>
          <Link className={`nav-link dropdown-toggle${active("/articles") ? " active" : ""}`} href="/articles" aria-haspopup="true" aria-expanded={openDropdown === "articles"} onFocus={() => setOpenDropdown("articles")} onClick={(event) => handleDropdownClick(event, "articles")}>Articles</Link>
          <div className={`dropdown-menu mega-menu w-100${openDropdown === "articles" ? " show" : ""}`}><div className="container"><div className="row g-4"><div className="col-12"><div className="mega-col-title"><i className="bi bi-journal-text me-1" />Pillar Guides</div>{articles.map((article) => <Link className="dropdown-item" href={`/articles/${article.slug}`} key={article.slug} onClick={closeNavigation}>{article.name}</Link>)}</div></div></div></div>
        </li>
        <li className="nav-item"><Link className={`nav-link${active("/contact") ? " active" : ""}`} href="/contact" onClick={closeNavigation}>Contact Us</Link></li>
      </ul><div className="d-flex gap-2 mt-3 mt-lg-0"><Link href="/user" className="btn btn-outline-maroon" onClick={closeNavigation}><i className="bi bi-person me-1" />User Login</Link><Link href="/contact" className="btn btn-book" onClick={closeNavigation}>Get In Touch</Link></div></div>
    </div></nav>
  </>;
}
