"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { articles, teachers } from "@/data/site";

const contact = {
  whatsapp: "https://wa.me/919999999999?text=Hi%20connect2infinity%2C%20I%27d%20like%20to%20know%20more.",
  phone: "+919999999999",
  email: "connect@connect2infinity.ai",
};

type Message = { from: "bot" | "user"; text: string };

export function FloatingWidgets() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("#contactForm");
    if (!form) return;
    const submit = (event: SubmitEvent) => {
      event.preventDefault();
      const name = (document.querySelector<HTMLInputElement>("#contactName")?.value || "Visitor").trim();
      const email = (document.querySelector<HTMLInputElement>("#contactEmail")?.value || "").trim();
      const message = (document.querySelector<HTMLTextAreaElement>("#contactMessage")?.value || "").trim();
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(`Message from ${name} via connect2infinity.ai`)}&body=${encodeURIComponent(`${message}\n\nReply to: ${email}`)}`;
    };
    form.addEventListener("submit", submit);
    return () => form.removeEventListener("submit", submit);
  }, [pathname]);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages]);

  const toggle = () => {
    setOpen((value) => !value);
    if (!messages.length) setMessages([{ from: "bot", text: "Namaste 🙏 I’m the connect2infinity guide. Ask me about a teacher, meditation, Parmatma, or how to contact us." }]);
  };

  const respond = (raw: string) => {
    const text = raw.toLowerCase();
    const teacher = teachers.find((item) => text.includes(item.name.toLowerCase()) || text.includes(item.slug.replaceAll("-", " ")));
    const article = articles.find((item) => text.includes(item.name.toLowerCase()));
    let answer = "I can help you explore our ten teachers, four pillar guides, or get in touch with the team.";
    if (teacher) answer = `You can explore ${teacher.name} in the Teachers section.`;
    else if (article) answer = `You’ll find “${article.name}” in our Articles section.`;
    else if (/meditat/.test(text)) answer = "Start with The Stillness Toolkit — a practical guide to meditation techniques.";
    else if (/parmatma/.test(text)) answer = "Our “What is Parmatma?” guide is the best place to begin.";
    else if (/purpose/.test(text)) answer = "Take a look at Finding Your Life Purpose in our pillar guides.";
    else if (/contact|email|call|whatsapp/.test(text)) answer = `Email us at ${contact.email}, or use the WhatsApp and call buttons beside this chat.`;
    setMessages((items) => [...items, { from: "bot", text: answer }]);
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((items) => [...items, { from: "user", text }]);
    setInput("");
    window.setTimeout(() => respond(text), 250);
  };

  const quick = (text: string) => { setMessages((items) => [...items, { from: "user", text }]); window.setTimeout(() => respond(text), 200); };

  return <>
    <div className="c2i-social-rail"><a href="#" data-brand="facebook" aria-label="Facebook"><i className="bi bi-facebook" /></a><a href="#" data-brand="instagram" aria-label="Instagram"><i className="bi bi-instagram" /></a><a href="#" data-brand="youtube" aria-label="YouTube"><i className="bi bi-youtube" /></a><a href="#" data-brand="twitter" aria-label="X / Twitter"><i className="bi bi-twitter-x" /></a></div>
    <div className="c2i-fab-stack">
      <button type="button" className="c2i-fab c2i-fab-chat" aria-label="Chat with our assistant" onClick={toggle}><span className="c2i-fab-label">Ask us anything</span><i className="bi bi-chat-dots-fill" /></button>
      <a className="c2i-fab c2i-fab-whatsapp" href={contact.whatsapp} target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><span className="c2i-fab-label">Chat on WhatsApp</span><i className="bi bi-whatsapp" /></a>
      <a className="c2i-fab c2i-fab-call" href={`tel:${contact.phone}`} aria-label="Call us"><span className="c2i-fab-label">Call Us</span><i className="bi bi-telephone-fill" /></a>
    </div>
    <div className={`c2i-chat-panel${open ? " c2i-open" : ""}`} aria-hidden={!open}>
      <div className="c2i-chat-header"><div className="c2i-chat-avatar">ॐ</div><div><div className="c2i-chat-title">connect2infinity Guide</div><div className="c2i-chat-sub">Usually replies instantly</div></div><button type="button" className="c2i-chat-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button></div>
      <div className="c2i-chat-body" ref={bodyRef}>{messages.map((message, index) => <div className={`c2i-msg c2i-msg-${message.from}`} key={index}>{message.text}</div>)}</div>
      <div className="c2i-chat-quick">{["Explore Teachers", "Read the Guides", "What is Parmatma?", "Contact Us"].map((label) => <button className="c2i-chip" type="button" key={label} onClick={() => quick(label)}>{label}</button>)}</div>
      <form className="c2i-chat-form" onSubmit={send}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your question..." autoComplete="off" /><button type="submit" aria-label="Send"><i className="bi bi-send-fill" /></button></form>
    </div>
  </>;
}
