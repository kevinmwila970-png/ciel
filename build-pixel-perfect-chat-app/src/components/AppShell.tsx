"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppProvider, useApp } from "@/lib/store";
import { groupLabel } from "@/lib/study";
import { THEMES } from "@/lib/themes";
import { Icon, Logo, Quill } from "./icons";
import { Splash } from "./Splash";
import {
  EditorOverlay,
  ExplainView,
  HarvestView,
  HistoryView,
  HomeChat,
  HomeworkView,
  ReportView,
  ResearchView,
  SearchView,
  SocraticView,
  TutoringView,
  WritingView,
} from "./study-views";
import {
  GuideView,
  LibraryView,
  PlannerView,
  ProfileView,
  QuizView,
  ReaderOverlay,
  SettingsView,
  VoiceView,
} from "./more-views";
import type { View } from "@/lib/types";

function Shell({ initialView }: { initialView: View }) {
  const app = useApp();
  const [splash, setSplash] = useState<"pending" | "show" | "hide">("pending");
  const [modeOpen, setModeOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  // Plays on every fresh page load / refresh / new tab. Never on in-app
  // navigation, because the splash lives above the router-less view switch.
  useEffect(() => {
    setSplash("show");
  }, []);

  // SEO landing pages (/library, /writing-pad, …) open directly on that tool.
  useEffect(() => {
    if (initialView !== "home") app.setView(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      });
    }
    const w = window as unknown as { __sageInstall?: { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } };
    const onPrompt = (event: Event) => {
      event.preventDefault();
      w.__sageInstall = event as unknown as { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
    };
    const onInstalled = () => {
      w.__sageInstall = undefined;
      app.toast("Sage installed. Open it from your desktop or home screen.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [app]);

  async function install() {
    const w = window as unknown as { __sageInstall?: { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } };
    const ev = w.__sageInstall;
    if (ev) {
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        if (choice?.outcome === "accepted") app.toast("Installing Sage…");
        w.__sageInstall = undefined;
      } catch {
        app.toast("The install prompt was dismissed. Try the browser menu → Install app.");
      }
      return;
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      app.toast("Sage is already installed and running as an app.");
      return;
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.alert(
      isIos
        ? "To install Sage on iPhone or iPad:\n\n1. Tap the Share button in Safari.\n2. Choose Add to Home Screen.\n3. Tap Add.\n\nSage then opens full screen like a real app."
        : "To install Sage:\n\n• Desktop Chrome or Edge: click the Install icon in the address bar, or open the browser menu → Apps → Install this site as an app.\n• Android Chrome: menu → Add to Home screen.\n\nIf no install option appears, keep the tab open a few seconds and try again.",
    );
  }

  function toggleNav() {
    if (window.innerWidth <= 768) app.setMobileOpen(!app.mobileOpen);
    else app.toggleSidebar();
  }

  if (splash === "pending") return <div className="boot" />;
  const splashEl = splash === "show" ? <Splash onDone={() => setSplash("hide")} /> : null;

  const recent = app.chats.filter((chat) => chat.lastOpenedAt > 0 && !chat.pinned).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 5);
  const pinned = app.chats.filter((chat) => chat.pinned);
  const recentGroups = (["Today", "Yesterday", "Older"] as const).map((label) => ({ label, rows: recent.filter((chat) => groupLabel(chat.lastOpenedAt) === label) })).filter((group) => group.rows.length);

  const appView = (
    <div className="app">
      <div className={`backdrop ${app.mobileOpen ? "show" : ""}`} onClick={() => app.setMobileOpen(false)} />
      <aside className={`sidebar ${app.sidebarOpen ? "open" : "closed"} ${app.mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <Logo />
          <span className="brand-name hide-closed">Sage</span>
          <button className="brand-caret hide-closed" type="button" aria-label="Sage menu" onClick={() => app.setView("guide")}>▾</button>
          <div className="brand-actions hide-closed">
            <button className="mini" type="button" aria-label="New chat" onClick={app.newChat}><Icon name="compose" size={15} /></button>
            <button className="mini" type="button" aria-label="Search chats" onClick={() => app.setView("history")}><Icon name="search" size={15} /></button>
            <button className="mini" type="button" aria-label="Chat history" onClick={() => app.setView("history")}><Icon name="history" size={15} /></button>
          </div>
        </div>
        <div className="nav-scroll">
          <Nav icon="chat" label="New chat" tag="CHAT" active={app.view === "home"} onClick={app.newChat} />
          <Nav icon="book" label="Library" active={app.view === "library"} onClick={() => app.setView("library")} />
          <Nav icon="pen" label="Writing Pad" active={app.view === "writing"} onClick={() => app.setView("writing")} />
          <Section icon="compass" label="Research Trail" open={app.sections.research} onToggle={() => app.toggleSection("research")} onClick={() => app.setView("research")} active={app.view === "research"}>
            <div className="section-label hide-closed">My Researches</div>
            {app.researches.slice(0, 6).map((item) => (
              <button key={item.id} className="sub-item" type="button" onClick={() => app.setView("research")}>{item.topic}</button>
            ))}
          </Section>
          <Nav icon="cap" label="Harvest Board" active={app.view === "harvest"} onClick={() => app.setView("harvest")} />
          <Nav icon="target" label="Quiz Studio" active={app.view === "quiz"} onClick={() => app.setView("quiz")} />
          <button className="section-label hide-closed" type="button" onClick={() => app.toggleSection("pinned")} style={{ background: "none", border: 0 }}>
            {app.sections.pinned ? "▼" : "▶"} Pinned
          </button>
          {app.sections.pinned ? pinned.map((chat) => (
            <button key={chat.id} className="sub-item" type="button" onClick={() => app.openChat(chat.id)}>{chat.title}</button>
          )) : null}
          <button className="section-label hide-closed" type="button" onClick={() => app.toggleSection("recents")} style={{ background: "none", border: 0 }}>
            {app.sections.recents ? "▼" : "▶"} Recents
          </button>
          {app.sections.recents ? recentGroups.map((group) => (
            <div key={group.label}>
              <div className="section-label hide-closed">{group.label}</div>
              {group.rows.map((chat) => (
                <button key={chat.id} className={`sub-item ${app.activeChatId === chat.id ? "active" : ""}`} type="button" onClick={() => app.openChat(chat.id)}>{chat.title}</button>
              ))}
            </div>
          )) : null}
        </div>
        <div className="side-foot">
          <button className={`foot-item ${app.view === "history" ? "active" : ""}`} type="button" onClick={() => app.setView("history")}><span className="nav-ico"><Icon name="history" size={16} /></span><span className="label hide-closed">Chat History</span><span className="count hide-closed">{app.chats.length}</span></button>
          <button className="foot-item" type="button" onClick={() => app.setView("guide")}><span className="nav-ico"><Icon name="book" size={16} /></span><span className="hide-closed">Guide</span></button>
          <button className="foot-item" type="button" onClick={() => app.setView("settings")}><span className="nav-ico"><Icon name="gear" size={16} /></span><span className="hide-closed">Settings</span></button>
          <button className="dl-btn" type="button" onClick={install}><Icon name="download" size={16} /><span className="hide-closed">Download App</span></button>
          <button className="foot-item profile-row" type="button" onClick={() => app.setView("profile")}>
            {app.avatar ? <img className="avatar" src={app.avatar} alt="" /> : <span className="avatar">{app.username.slice(0, 1).toUpperCase()}</span>}
            <span className="hide-closed">Profile</span>
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn" type="button" aria-label="Toggle sidebar" onClick={toggleNav}><Icon name="panel" size={16} /></button>
            <span className="top-logo"><Quill size={28} /><span className="top-logo-name">Sage</span></span>
            <div className="mode-wrap" style={{ position: "relative" }}>
              <button className="ghost-select" type="button" onClick={() => setModeOpen((v) => !v)}>
                <Icon name="leaf" size={14} /> Auto ▾
              </button>
              {modeOpen ? (
                <div className="menu">
                  {(["auto", "explain", "timetable", "search"] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => { app.setComposerMode(mode); setModeOpen(false); }}>{mode === "auto" ? "Auto" : mode === "explain" ? "Explain a concept" : mode === "timetable" ? "Study timetable" : "Search the web"}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="top-center">
            <div className="mode-toggle">
              <button className={app.view === "socratic" ? "" : "on"} type="button" onClick={() => app.setView("home")}>Chat</button>
              <button className={app.view === "socratic" ? "on" : ""} type="button" onClick={() => app.setView("socratic")}>Work</button>
            </div>
          </div>
          <div className="top-right">
            <div style={{ position: "relative" }}>
              <button
                className="theme-btn tip"
                type="button"
                data-tip="Theme"
                aria-label="Theme"
                aria-expanded={themeOpen}
                onClick={() => setThemeOpen((v) => !v)}
              >
                <Icon name={app.colorMode === "light" ? "sun" : app.colorMode === "system" ? "palette" : "moon"} size={20} />
              </button>
              {themeOpen ? (
                <div className="theme-pop" role="dialog" aria-label="Choose a theme">
                  <div className="theme-pop-head">
                    <span>Theme</span>
                    <span className="muted small">{THEMES.length} themes</span>
                    <button className="mini" type="button" aria-label="Close theme picker" onClick={() => setThemeOpen(false)}><Icon name="close" size={14} /></button>
                  </div>
                  <div className="theme-modes">
                    {(["light", "dark", "system"] as const).map((mode) => (
                      <button key={mode} className={`cat ${app.colorMode === mode ? "on" : ""}`} type="button" onClick={() => app.setColorMode(mode)}>{mode}</button>
                    ))}
                  </div>
                  <div className="theme-grid theme-grid-pop">
                    {THEMES.map((theme) => (
                      <button key={theme.id} className={`swatch ${app.themeId === theme.id ? "on" : ""}`} type="button" title={theme.name} onClick={() => { app.setThemeId(theme.id); }}>
                        <span className="swatch-bars"><span style={{ background: theme.sidebarBg }} /><span style={{ background: theme.primary }} /><span style={{ background: theme.bg }} /></span>
                        <span className="swatch-name">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button className="avatar-btn tip" type="button" data-tip={app.username} aria-label="Profile" onClick={() => app.setView("profile")}>
              {app.avatar ? <img className="avatar avatar-32" src={app.avatar} alt="" /> : <span className="avatar avatar-32">{app.username.slice(0, 1).toUpperCase()}</span>}
            </button>
          </div>
        </header>
        <div className="content">
          {app.view === "home" ? <HomeChat /> : null}
          {app.view === "history" ? <HistoryView /> : null}
          {app.view === "library" ? <LibraryView /> : null}
          {app.view === "writing" ? <WritingView /> : null}
          {app.view === "research" ? <ResearchView /> : null}
          {app.view === "harvest" ? <HarvestView /> : null}
          {app.view === "quiz" ? <QuizView /> : null}
          {app.view === "voice" ? <VoiceView /> : null}
          {app.view === "planner" ? <PlannerView /> : null}
          {app.view === "socratic" ? <SocraticView /> : null}
          {app.view === "profile" ? <ProfileView /> : null}
          {app.view === "settings" ? <SettingsView /> : null}
          {app.view === "guide" ? <GuideView /> : null}
          {app.view === "explain" ? <ExplainView /> : null}
          {app.view === "search" ? <SearchView /> : null}
          {app.view === "tutoring" ? <TutoringView /> : null}
          {app.view === "homework" ? <HomeworkView /> : null}
          {app.view === "report" ? <ReportView /> : null}
        </div>
        <nav className="bottom-nav">
          <button className={app.view === "home" ? "on" : ""} type="button" onClick={() => app.setView("home")}><Icon name="chat" size={16} />Home</button>
          <button className={app.view === "library" ? "on" : ""} type="button" onClick={() => app.setView("library")}><Icon name="book" size={16} />Library</button>
          <button className={app.view === "planner" ? "on" : ""} type="button" onClick={() => app.setView("planner")}><Icon name="calendar" size={16} />Plan</button>
          <button className={app.view === "quiz" ? "on" : ""} type="button" onClick={() => app.setView("quiz")}><Icon name="target" size={16} />Quiz</button>
          <button type="button" onClick={() => app.setMobileOpen(true)}><Icon name="panel" size={16} />Menu</button>
        </nav>
      </div>
      <ReaderOverlay />
      <EditorOverlay />
      <div className="toast-wrap">{app.toasts.map((toast) => <div key={toast.id} className="toast">{toast.text}</div>)}</div>
    </div>
  );

  return (
    <>
      {app.ready ? appView : <div className="boot" />}
      {splashEl}
    </>
  );
}

function Nav({ icon, label, active, onClick, count, tag }: { icon: string; label: string; active?: boolean; onClick: () => void; count?: number; tag?: string }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="nav-ico"><Icon name={icon} size={18} /></span>
      <span className="label hide-closed">{label}</span>
      {tag ? <span className="chat-tag hide-closed">{tag}</span> : null}
      {typeof count === "number" ? <span className="count hide-closed">{count}</span> : null}
    </button>
  );
}

function Section({ icon, label, count, open, onToggle, onClick, active, children }: { icon: string; label: string; count?: number; open: boolean; onToggle: () => void; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className={`nav-item ${active ? "active" : ""}`}>
        <button className="nav-ico" type="button" aria-label={label} onClick={onClick} style={{ background: "none", border: 0, color: "inherit" }}><Icon name={icon} size={18} /></button>
        <button className="label hide-closed" type="button" onClick={onClick} style={{ background: "none", border: 0, color: "inherit", textAlign: "left" }}>{label}</button>
        {typeof count === "number" ? <span className="count hide-closed">{count}</span> : null}
        <button className="chev hide-closed" type="button" aria-label={open ? "Collapse" : "Expand"} onClick={onToggle}>{open ? "▼" : "▶"}</button>
      </div>
      {open ? <div className="sub hide-closed">{children}</div> : null}
    </div>
  );
}

export function AppShell({ initialView = "home" }: { initialView?: View }) {
  return (
    <AppProvider>
      <Shell initialView={initialView} />
    </AppProvider>
  );
}

export type { View };
