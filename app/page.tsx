"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  Menu,
  Plus,
  Save,
  Search,
  Shield,
  Swords,
  Trash2,
  X,
} from "lucide-react";

type Character = {
  id: number;
  name: string;
  nickname: string;
  note: string | null;
  is_registered: boolean;
};

type StrategyNote = {
  id: number;
  my_character_id: number;
  target_character_id: number;
  target_name: string;
  target_nickname: string;
  content: string;
  youtube_url: string | null;
  updated_at: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? "通信に失敗しました。");
  }
  return result.data;
}

function FighterPortrait({ character, size = "normal" }: { character: Character; size?: "normal" | "large" }) {
  return (
    <span className={`fighter-portrait fighter-portrait--${size}`}>
      <Image
        src={`/characters/${character.id}.png`}
        alt=""
        width={size === "large" ? 84 : 54}
        height={size === "large" ? 84 : 54}
        onError={(event) => {
          event.currentTarget.style.visibility = "hidden";
        }}
      />
    </span>
  );
}

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [myCharacterId, setMyCharacterId] = useState<number | null>(null);
  const [targetCharacterId, setTargetCharacterId] = useState<number | null>(null);
  const [notes, setNotes] = useState<StrategyNote[]>([]);
  const [notesCharacterId, setNotesCharacterId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ noteId: number | null; content: string; url: string }>({ noteId: null, content: "", url: "" });
  const [newCharacterId, setNewCharacterId] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeNotes = notesCharacterId === myCharacterId ? notes : [];
  const registeredCharacters = characters.filter((character) => character.is_registered);
  const availableCharacters = characters.filter((character) => !character.is_registered);
  const selectedCharacter = characters.find((character) => character.id === myCharacterId);
  const selectedNote = activeNotes.find((note) => note.target_character_id === targetCharacterId);
  const targetCharacter = selectedNote && characters.find((character) => character.id === targetCharacterId);
  const draftContent = selectedNote && draft.noteId === selectedNote.id ? draft.content : selectedNote?.content ?? "";
  const draftUrl = selectedNote && draft.noteId === selectedNote.id ? draft.url : selectedNote?.youtube_url ?? "";
  const visibleCharacters = characters.filter((character) => {
    const query = search.trim().toLocaleLowerCase("ja");
    return !query || `${character.name} ${character.nickname} ${character.id}`.toLocaleLowerCase("ja").includes(query);
  });

  async function refreshCharacters() {
    const result = await requestApi<Character[]>("/api/sumabura/characters");
    setCharacters(result);
    return result;
  }

  useEffect(() => {
    let active = true;
    requestApi<Character[]>("/api/sumabura/characters")
      .then((result) => {
        if (!active) return;
        setCharacters(result);
        setMyCharacterId(result.find((character) => character.is_registered)?.id ?? null);
        setNewCharacterId(result.find((character) => !character.is_registered)?.id.toString() ?? "");
      })
      .catch((error: unknown) => {
        if (active) setNotice({ kind: "error", message: error instanceof Error ? error.message : "ファイターを取得できませんでした。" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (myCharacterId === null) return;

    let active = true;
    requestApi<StrategyNote[]>(`/api/sumabura/strategy-notes?my_character_id=${myCharacterId}`)
      .then((result) => {
        if (!active) return;
        setNotes(result);
        setNotesCharacterId(myCharacterId);
        setTargetCharacterId((current) =>
          current !== null && result.some((note) => note.target_character_id === current)
            ? current
            : result[0]?.target_character_id ?? null,
        );
      })
      .catch((error: unknown) => {
        if (active) setNotice({ kind: "error", message: error instanceof Error ? error.message : "対策メモを取得できませんでした。" });
      });
    return () => {
      active = false;
    };
  }, [myCharacterId]);

  async function addCharacter() {
    if (!newCharacterId) return;
    setNotice(null);
    try {
      const created = await requestApi<{ id: number; character_id: number }>("/api/sumabura/user-characters", {
        method: "POST",
        body: JSON.stringify({ character_id: Number(newCharacterId) }),
      });
      const updated = await refreshCharacters();
      setMyCharacterId(created.character_id);
      setNewCharacterId(updated.find((character) => !character.is_registered)?.id.toString() ?? "");
      setNotice({ kind: "success", message: `${updated.find((character) => character.id === created.character_id)?.name}を使用キャラに登録しました。` });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "登録に失敗しました。" });
    }
  }

  async function removeCharacter(character: Character) {
    if (!window.confirm(`${character.name}の使用キャラ登録を解除しますか？`)) return;
    setNotice(null);
    try {
      await requestApi<{ id: number; is_deleted: boolean }>(
        `/api/sumabura/user-characters?character_id=${character.id}`,
        { method: "DELETE" },
      );
      const updated = await refreshCharacters();
      if (myCharacterId === character.id) {
        setMyCharacterId(updated.find((item) => item.is_registered)?.id ?? null);
      }
      setNotice({ kind: "success", message: `${character.name}の登録を解除しました。` });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "登録解除に失敗しました。" });
    }
  }

  async function saveNote() {
    if (myCharacterId === null || targetCharacterId === null || !selectedNote) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await requestApi<StrategyNote>("/api/sumabura/strategy-notes", {
        method: "PUT",
        body: JSON.stringify({
          my_character_id: myCharacterId,
          target_character_id: targetCharacterId,
          content: draftContent,
          youtube_url: draftUrl.trim() || null,
        }),
      });
      setNotes((current) => current.map((note) => note.target_character_id === targetCharacterId ? updated : note));
      setNotice({ kind: "success", message: "対策メモを保存しました。" });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "保存に失敗しました。" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`portal-shell${sidebarOpen ? "" : " portal-shell--sidebar-closed"}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <button className="icon-button sidebar-toggle" type="button" aria-label="メニューを切り替え" onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <Menu size={19} /> : <ChevronRight size={19} />}
          </button>
          <span className="brand-mark"><Gamepad2 size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">teru-portal</span>
        </div>
        <div className="topbar-meta"><span className="connection-dot" /> PERSONAL WORKSPACE</div>
      </header>

      <div className="portal-body">
        <aside className="sidebar" aria-label="メインメニュー">
          <div className="sidebar-section-label">WORKSPACE</div>
          <button className="nav-item nav-item--active" type="button" title="スマブラ">
            <Swords size={18} /><span>スマブラ</span><span className="nav-active-mark" />
          </button>
          <div className="sidebar-bottom"><span className="sidebar-avatar">T</span><span className="sidebar-user">ローカル利用</span><CircleHelp size={16} /></div>
        </aside>

        <main className="main-content">
          <div className="page-heading">
            <div className="breadcrumbs"><span>ワークスペース</span><ChevronRight size={13} /><span>スマブラ</span></div>
            <div className="heading-row">
              <div>
                <p className="eyebrow">MATCHUP NOTEBOOK <span>·</span> 01</p>
                <h1>スマブラ</h1>
                <p className="page-description">ファイターごとの対策と参考動画をまとめる</p>
              </div>
              <div className="heading-stamp"><Shield size={16} /><span>PERSONAL<br />DATABASE</span></div>
            </div>
          </div>

          {notice && (
            <div className={`notice notice--${notice.kind}`} role="status">
              {notice.kind === "error" ? <AlertCircle size={19} /> : <Check size={19} />}
              <span>{notice.message}</span>
              <button className="notice-close" type="button" aria-label="通知を閉じる" onClick={() => setNotice(null)}><X size={17} /></button>
            </div>
          )}

          <section className="section-block" aria-labelledby="my-fighters-title">
            <div className="section-heading">
              <div className="section-title-wrap"><span className="section-index">01</span><div><h2 id="my-fighters-title">使用ファイター</h2><p>対策メモを管理する自分のファイター</p></div></div>
              <span className="section-count">{registeredCharacters.length} FIGHTERS</span>
            </div>
            <div className="my-fighters-panel">
              <div className="my-fighter-list">
                {registeredCharacters.map((character) => (
                  <div className={`my-fighter${character.id === myCharacterId ? " my-fighter--selected" : ""}`} key={character.id}>
                    <button className="my-fighter-select" type="button" onClick={() => setMyCharacterId(character.id)} aria-pressed={character.id === myCharacterId}>
                      <FighterPortrait character={character} />
                      <span className="my-fighter-name">{character.name}<small>{character.nickname}</small></span>
                      {character.id === myCharacterId && <span className="selected-mark"><Check size={13} /></span>}
                    </button>
                    <button className="remove-fighter" type="button" title={`${character.name}の登録を解除`} aria-label={`${character.name}の登録を解除`} onClick={() => void removeCharacter(character)}><Trash2 size={15} /></button>
                  </div>
                ))}
                {!loading && registeredCharacters.length === 0 && <p className="empty-inline">まだ使用ファイターが登録されていません。</p>}
              </div>
              <div className="add-fighter-control">
                <label className="sr-only" htmlFor="new-fighter">追加するファイター</label>
                <span className="select-wrap"><select id="new-fighter" value={newCharacterId} onChange={(event) => setNewCharacterId(event.target.value)} disabled={availableCharacters.length === 0}><option value="">ファイターを選択</option>{availableCharacters.map((character) => <option value={character.id} key={character.id}>{character.name}</option>)}</select><ChevronDown size={15} /></span>
                <button className="button button--outline" type="button" onClick={() => void addCharacter()} disabled={!newCharacterId}><Plus size={16} />追加</button>
              </div>
            </div>
          </section>

          <section className="section-block" aria-labelledby="matchup-title">
            <div className="section-heading">
              <div className="section-title-wrap"><span className="section-index">02</span><div><h2 id="matchup-title">対策対象ファイター</h2><p>{selectedCharacter ? `${selectedCharacter.name}から見た対戦メモ` : "使用ファイターを登録すると対策を編集できます"}</p></div></div>
              {selectedCharacter && <span className="active-fighter-label"><span>MY FIGHTER</span>{selectedCharacter.name}<ChevronDown size={13} /></span>}
            </div>

            <div className="matchup-layout">
              <div className="target-panel">
                  <div className="target-panel-head"><span>対戦カード</span><span>{activeNotes.length.toString().padStart(2, "0")}</span></div>
                <div className="target-list" role="listbox" aria-label="対策対象ファイター">
                    {activeNotes.map((note) => {
                    const character = characters.find((item) => item.id === note.target_character_id);
                    if (!character) return null;
                    return <button className={`target-row${character.id === targetCharacterId ? " target-row--selected" : ""}`} type="button" role="option" aria-selected={character.id === targetCharacterId} onClick={() => setTargetCharacterId(character.id)} key={character.id}>
                      <FighterPortrait character={character} />
                      <span className="target-row-name">{character.name}<small>{character.nickname}</small></span>
                      <span className={`note-status${note.content.trim() ? " note-status--done" : ""}`} title={note.content.trim() ? "メモあり" : "メモなし"} />
                      <ChevronRight className="target-chevron" size={15} />
                    </button>;
                  })}
                  {loading && <div className="loading-copy">ファイターを読み込み中...</div>}
                  {!loading && myCharacterId !== null && notesCharacterId !== myCharacterId && <div className="loading-copy">対策を読み込み中...</div>}
                  {!loading && myCharacterId !== null && notesCharacterId === myCharacterId && activeNotes.length === 0 && <div className="loading-copy">対策データがありません。</div>}
                  {!loading && myCharacterId === null && <div className="loading-copy">先に使用ファイターを登録してください。</div>}
                </div>
              </div>

              <div className="editor-panel">
                {targetCharacter ? <>
                  <div className="editor-heading">
                    <FighterPortrait character={targetCharacter} size="large" />
                    <div className="editor-fighter-name"><span>VS. TARGET</span><h3>{targetCharacter.name}</h3><p>{targetCharacter.nickname} <span>·</span> #{String(targetCharacter.id).padStart(2, "0")}</p></div>
                    <span className="editor-card-icon"><Swords size={17} /></span>
                  </div>
                  <label className="field-label" htmlFor="strategy-content">対策メモ <span>STRATEGY</span></label>
                  <textarea id="strategy-content" className="strategy-textarea" value={draftContent} onChange={(event) => selectedNote && setDraft({ noteId: selectedNote.id, content: event.target.value, url: draftUrl })} placeholder="立ち回り、警戒する技、確定反撃など..." disabled={!selectedNote} />
                  <label className="field-label youtube-label" htmlFor="youtube-url">参考動画 <span>YOUTUBE URL</span></label>
                  <div className="url-field"><span className="youtube-play">▶</span><input id="youtube-url" type="url" value={draftUrl} onChange={(event) => selectedNote && setDraft({ noteId: selectedNote.id, content: draftContent, url: event.target.value })} placeholder="https://www.youtube.com/..." disabled={!selectedNote} /></div>
                  <div className="editor-footer"><span>{selectedNote ? `更新 ${new Date(selectedNote.updated_at).toLocaleDateString("ja-JP")}` : "この組み合わせのメモがありません"}</span><button className="button button--primary" type="button" onClick={() => void saveNote()} disabled={!selectedNote || saving}><Save size={16} />{saving ? "保存中..." : "変更を保存"}</button></div>
                </> : <div className="editor-empty"><span className="editor-empty-icon"><Swords size={22} /></span><p>対策対象を選択</p><span>左の一覧からファイターを選ぶと、メモを編集できます。</span></div>}
              </div>
            </div>
          </section>

          <section className="section-block directory-section" aria-labelledby="directory-title">
            <div className="section-heading section-heading--directory">
              <div className="section-title-wrap"><span className="section-index">03</span><div><h2 id="directory-title">ファイター一覧</h2><p>全ファイターから対策対象を検索</p></div></div>
              <label className="directory-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="名前・略称で検索" aria-label="ファイターを検索" />{search && <button type="button" onClick={() => setSearch("")} aria-label="検索をクリア"><X size={14} /></button>}</label>
            </div>
            <div className="fighter-grid">
              {visibleCharacters.map((character) => <button type="button" className={`fighter-tile${character.id === targetCharacterId ? " fighter-tile--selected" : ""}${character.is_registered ? " fighter-tile--registered" : ""}`} key={character.id} onClick={() => {
                if (activeNotes.some((note) => note.target_character_id === character.id)) setTargetCharacterId(character.id);
              }} title={character.is_registered ? `${character.name} · 使用ファイター` : character.name}>
                <FighterPortrait character={character} />
                <span className="fighter-tile-name">{character.name}</span>
                <span className="fighter-tile-nickname">{character.nickname}</span>
                {character.id === targetCharacterId && <span className="tile-check"><Check size={11} /></span>}
              </button>)}
              {visibleCharacters.length === 0 && <p className="empty-inline">一致するファイターがいません。</p>}
            </div>
            <div className="directory-foot"><span><span className="legend-dot legend-dot--registered" /> 使用ファイター</span><span><span className="legend-dot legend-dot--target" /> 選択中の対策対象</span><span className="directory-total">{visibleCharacters.length} / {characters.length} FIGHTERS</span></div>
          </section>

          <footer className="page-footer"><span>TERU PORTAL <span>·</span> SUMABURA NOTEBOOK</span><span>LOCAL WORKSPACE</span></footer>
        </main>
      </div>
    </div>
  );
}
