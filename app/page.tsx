"use client";

import Image from "next/image";
import { useEffect, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Gamepad2,
  Menu,
  Pencil,
  Play,
  Save,
  Search,
  Swords,
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

/**
 * API共通レスポンスを検証し、呼び出し元で扱いやすいdataだけを返します。
 * HTTPエラーまたはAPIエラーの場合は、サーバーからのメッセージを例外にします。
 * @template T 成功時に返されるデータの型
 * @param {string} url 呼び出すAPIのURL
 * @param {RequestInit} [init] HTTPメソッドやリクエスト本文などの追加設定
 * @returns {Promise<T>} APIが返したdata
 * @throws {Error} HTTP通信またはAPI処理が失敗した場合
 */
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

/**
 * ファイターIDに対応する公開画像を表示します。
 * 画像名はIDと一致し、未登録画像があっても画面全体の表示を妨げません。
 * @param {{ character: Character; size?: "normal" | "large" }} props 表示するファイターと画像サイズ
 * @returns {import("react").JSX.Element} ファイターアイコン
 */
function FighterPortrait({ character }: { character: Character }) {
  return (
    <span className="fighter-portrait">
      <Image
        src={`/characters/${character.id}.png`}
        alt=""
        width={54}
        height={54}
        onError={(event) => {
          event.currentTarget.style.visibility = "hidden";
        }}
      />
    </span>
  );
}

/**
 * YouTube共有URLから、埋め込みに使えるURLを生成します。
 * 許可したYouTubeホストと11文字の動画ID以外は埋め込まず、枠だけ表示します。
 * @param {string} value 入力または保存済みのYouTube URL
 * @returns {string | null} nocookie形式の埋め込みURL。変換できない場合はnull
 */
function getYoutubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const allowedHosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"];
    if (!allowedHosts.includes(url.hostname)) return null;

    const videoId = url.hostname === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("v") ?? url.pathname.match(/\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

/**
 * スマブラ管理画面を構成し、使用キャラ・対策メモ・ファイター一覧を表示します。
 * @returns {import("react").JSX.Element} スマブラ管理画面
 */
export default function Home() {
  /** APIから取得したファイターマスターと、現在選択している自キャラ/対象を保持します。 */
  const [characters, setCharacters] = useState<Character[]>([]);
  const [myCharacterId, setMyCharacterId] = useState<number | null>(null);
  const [targetCharacterId, setTargetCharacterId] = useState<number | null>(null);

  /** 自キャラごとのメモ一覧と、その一覧を取得したキャラIDを対にして保持します。 */
  const [notes, setNotes] = useState<StrategyNote[]>([]);
  const [notesCharacterId, setNotesCharacterId] = useState<number | null>(null);

  /** 保存前に編集中のメモ本文と動画URLを保持します。 */
  const [draft, setDraft] = useState<{ noteId: number | null; content: string; url: string }>({ noteId: null, content: "", url: "" });

  /** ファイター一覧、使用キャラ、対策対象それぞれの検索条件です。 */
  const [search, setSearch] = useState("");
  const [myFighterSearch, setMyFighterSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [onlyRegistered, setOnlyRegistered] = useState(false);
  const [directoryVisible, setDirectoryVisible] = useState(true);

  /** 一覧の編集対象、入力途中の値、保存中の行IDを保持します。 */
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);
  const [characterDraft, setCharacterDraft] = useState({ nickname: "", note: "", isRegistered: false });
  const [savingCharacterId, setSavingCharacterId] = useState<number | null>(null);

  /** 通知表示、初期読み込み、メモ保存中の状態を保持します。 */
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /** 通知は4秒後に自動で閉じ、変更/手動閉じ時は前のタイマーを破棄します。 */
  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  /** 取得済みメモが現在選択中の自キャラに属する場合だけ画面へ反映します。 */
  const activeNotes = notesCharacterId === myCharacterId ? notes : [];
  const registeredCharacters = characters.filter((character) => character.is_registered);
  const selectedCharacter = characters.find((character) => character.id === myCharacterId);
  const selectedNote = activeNotes.find((note) => note.target_character_id === targetCharacterId);
  const targetCharacter = selectedNote && characters.find((character) => character.id === targetCharacterId);
  const draftContent = selectedNote && draft.noteId === selectedNote.id ? draft.content : selectedNote?.content ?? "";
  const draftUrl = selectedNote && draft.noteId === selectedNote.id ? draft.url : selectedNote?.youtube_url ?? "";
  /** 許可済み形式のURLがあれば埋め込み先を作り、それ以外は仮枠にします。 */
  const youtubeEmbedUrl = draftUrl ? getYoutubeEmbedUrl(draftUrl) : null;
  /** ファイター一覧へ検索条件と「使用キャラのみ」条件を適用します。 */
  const visibleCharacters = characters.filter((character) => {
    const query = search.trim().toLocaleLowerCase("ja");
    return (!onlyRegistered || character.is_registered)
      && (!query || character.nickname.toLocaleLowerCase("ja") === query);
  });
  /** 使用ファイター欄では登録済みキャラだけを略称で絞り込みます。 */
  const myFighterQuery = myFighterSearch.trim().toLocaleLowerCase("ja");
  const visibleMyFighters = registeredCharacters.filter((character) =>
    !myFighterQuery || character.nickname.toLocaleLowerCase("ja") === myFighterQuery,
  );
  /**
   * 略称の入力値を対象へ反映し、完全一致するファイターを選択します。
   * @param {string} value 検索欄の略称
   * @returns {void}
   */
  function selectTargetFromSearch(value: string) {
    setTargetSearch(value);
    const query = value.trim().toLocaleLowerCase("ja");
    if (!query) return;

    const selectedNote = activeNotes.find((note) =>
      note.target_nickname.toLocaleLowerCase("ja") === query,
    );

    if (selectedNote) {
      setTargetCharacterId(selectedNote.target_character_id);
      setTargetSearch("");
    }
  }

  /**
   * Enterキーで対策対象検索を確定し、一致対象をメモ編集欄へ反映します。
   * @param {KeyboardEvent<HTMLInputElement>} event 検索欄のキー入力イベント
   * @returns {void}
   */
  function handleTargetSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      selectTargetFromSearch(targetSearch);
    }
  }

  /**
   * ファイター一覧APIを再取得し、登録状態や編集後の値を同期します。
   * @returns {Promise<Character[]>} 更新後のファイター一覧
   */
  async function refreshCharacters() {
    const result = await requestApi<Character[]>("/api/sumabura/characters");
    setCharacters(result);
    return result;
  }

  /** 初回表示時にファイターを取得し、最初の使用キャラを選択します。 */
  useEffect(() => {
    // 画面が破棄された後に応答が返っても、state更新を行わないためのフラグです。
    let active = true;
    requestApi<Character[]>("/api/sumabura/characters")
      .then((result) => {
        if (!active) return;
        setCharacters(result);
        setMyCharacterId(result.find((character) => character.is_registered)?.id ?? null);
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

  /**
   * 自キャラ変更時にそのキャラの対策メモを取得します。
   * 以前の選択対象が新しいメモにもあれば維持し、なければ先頭を選択します。
   */
  useEffect(() => {
    if (myCharacterId === null) return;

    // 自キャラを連続して切り替えた場合、古い取得結果を無視します。
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

  /**
   * 選択中の自キャラと対策対象のメモ本文・YouTube URLを保存します。
   * @returns {Promise<void>} 保存処理の完了
   */
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

  /**
   * 一覧の編集行を開き、対象ファイターの現在値を編集フォームへ複写します。
   * @param {Character} character 編集を開始するファイター
   * @returns {void}
   */
  function beginCharacterEdit(character: Character) {
    setEditingCharacterId(character.id);
    setCharacterDraft({ nickname: character.nickname, note: character.note ?? "", isRegistered: character.is_registered });
  }

  /**
   * 略称・説明・使用状態をファイター更新APIへまとめて保存します。
   * 使用状態の解除後は別の登録済みファイターへ選択を移し、API失敗時は一覧を再同期します。
   * @param {Character} character 更新対象のファイター
   * @returns {Promise<void>} 更新処理の完了
   */
  async function saveCharacter(character: Character) {
    const nickname = characterDraft.nickname.trim();
    const note = characterDraft.note || null;
    if (!nickname || nickname.length > 20) {
      setNotice({ kind: "error", message: "略称は1〜20文字で入力してください。" });
      return;
    }

    const nicknameChanged = nickname !== character.nickname;
    const noteChanged = note !== character.note;
    const registrationChanged = characterDraft.isRegistered !== character.is_registered;
    if (!nicknameChanged && !noteChanged && !registrationChanged) {
      setEditingCharacterId(null);
      return;
    }

    setSavingCharacterId(character.id);
    setNotice(null);
    try {
      await requestApi<Character>("/api/sumabura/characters", {
        method: "PUT",
        body: JSON.stringify({
          id: character.id,
          nickname,
          note,
          is_registered: characterDraft.isRegistered,
        }),
      });
      const updated = await refreshCharacters();
      if (myCharacterId === character.id && !characterDraft.isRegistered) {
        setMyCharacterId(updated.find((item) => item.is_registered)?.id ?? null);
      } else if (myCharacterId === null && characterDraft.isRegistered) {
        setMyCharacterId(character.id);
      }
      setEditingCharacterId(null);
      setNotice({ kind: "success", message: `${character.name}のファイター情報を更新しました。` });
    } catch (error) {
      try {
        await refreshCharacters();
      } catch {
        setNotice({ kind: "error", message: "更新に失敗し、最新のファイター情報も取得できませんでした。" });
      }
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "ファイター情報の更新に失敗しました。" });
    } finally {
      setSavingCharacterId(null);
    }
  }

  return (
    <div className={`portal-shell${sidebarOpen ? "" : " portal-shell--sidebar-closed"}`}>
      {/* アプリ名、サイドバーの表示切替、主要メニューをまとめた共通ナビゲーション */}
      <header className="topbar">
        <div className="topbar-brand">
          <button className="icon-button sidebar-toggle" type="button" aria-label="メニューを切り替え" onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <Menu size={19} /> : <ChevronRight size={19} />}
          </button>
          <span className="brand-mark"><Gamepad2 size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">teru-portal</span>
        </div>
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
          {/* ページタイトルと、下部のファイター一覧を表示/非表示にする操作 */}
          <div className="page-heading">
            <div className="heading-row">
              <h1>スマブラ</h1>
              <button className="directory-toggle" type="button" aria-expanded={directoryVisible} onClick={() => setDirectoryVisible((visible) => !visible)}>
                {directoryVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                ファイター一覧 {directoryVisible ? "非表示" : "表示"}
              </button>
            </div>
          </div>

          {notice && (
            <div className={`notice notice--${notice.kind}`} role="status">
              {notice.kind === "error" ? <AlertCircle size={19} /> : <Check size={19} />}
              <span>{notice.message}</span>
              <button className="notice-close" type="button" aria-label="通知を閉じる" onClick={() => setNotice(null)}><X size={17} /></button>
            </div>
          )}

          <div className="feature-columns">
          {/* 登録済み使用キャラを略称で検索し、選択中キャラを切り替える領域 */}
          <section className="section-block" aria-labelledby="my-fighters-title">
            <div className="section-heading">
              <div className="section-title-wrap"><div><h2 id="my-fighters-title">使用ファイター選択</h2></div></div>
            </div>
            <div className="my-fighters-panel">
              <label className="list-filter"><Search size={15} /><input value={myFighterSearch} onChange={(event) => setMyFighterSearch(event.target.value)} placeholder="略称で絞り込み..." aria-label="使用ファイターを略称で絞り込み" /></label>
              <div className="my-fighter-list">
                {visibleMyFighters.map((character) => <button className={`my-fighter${character.id === myCharacterId ? " my-fighter--selected" : ""}`} type="button" onClick={() => setMyCharacterId(character.id)} aria-pressed={character.id === myCharacterId} key={character.id}>
                  <FighterPortrait character={character} />
                  <span className="my-fighter-name">{character.name}</span>
                  <span className="my-fighter-note" title={character.note ?? ""}>{character.note || "—"}</span>
                </button>)}
                {!loading && registeredCharacters.length === 0 && <p className="empty-inline">まだ使用ファイターが登録されていません。</p>}
                {registeredCharacters.length > 0 && visibleMyFighters.length === 0 && <p className="empty-inline">一致する使用ファイターがいません。</p>}
              </div>
            </div>
          </section>

          {/* 略称入力で対戦相手を直接選び、メモとYouTube URLを編集する領域 */}
          <section className="section-block" aria-labelledby="matchup-title">
            <div className="section-heading">
              <div className="section-title-wrap"><div><h2 id="matchup-title">対策対象ファイター</h2></div></div>
              {selectedCharacter && <span className="active-fighter-label"><span>MY FIGHTER</span>{selectedCharacter.name}<ChevronDown size={13} /></span>}
            </div>

            <div className="matchup-layout">
              <div className="target-panel">
                <div className="target-picker">
                  <label className="list-filter target-filter"><Search size={15} /><input value={targetSearch} onChange={(event) => selectTargetFromSearch(event.target.value)} onKeyDown={handleTargetSearchKeyDown} placeholder="略称で絞り込み..." aria-label="対策対象を略称で絞り込み" /></label>
                </div>
              </div>

              <div className="editor-panel">
                {targetCharacter ? <>
                  <div className="editor-heading">
                    <FighterPortrait character={targetCharacter} />
                    <div className="editor-fighter-name"><h3>{targetCharacter.name}</h3></div>
                    <button className="button button--primary" type="button" onClick={() => void saveNote()} disabled={!selectedNote || saving}><Save size={16} />{saving ? "保存中..." : "変更を保存"}</button>
                  </div>
                  <label className="field-label" htmlFor="strategy-content">対策メモ</label>
                  <textarea id="strategy-content" className="strategy-textarea" value={draftContent} onChange={(event) => selectedNote && setDraft({ noteId: selectedNote.id, content: event.target.value, url: draftUrl })} placeholder="立ち回り、警戒する技、確定反撃など..." disabled={!selectedNote} />
                  <label className="field-label youtube-label" htmlFor="youtube-url">YouTube URL</label>
                  <div className="url-field"><span className="youtube-play">▶</span><input id="youtube-url" type="url" value={draftUrl} onChange={(event) => selectedNote && setDraft({ noteId: selectedNote.id, content: draftContent, url: event.target.value })} placeholder="https://www.youtube.com/..." disabled={!selectedNote} /></div>
                  <div className="video-frame">
                    {youtubeEmbedUrl ? <iframe src={youtubeEmbedUrl} title={`${targetCharacter.name}の対策動画`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" loading="lazy" allowFullScreen /> : <div className="video-placeholder" aria-label="YouTube埋め込み領域"><Play size={25} /></div>}
                  </div>
                </> : <div className="editor-empty"><span className="editor-empty-icon"><Swords size={22} /></span><p>対策対象を選択</p><span>左の一覧からファイターを選ぶと、メモを編集できます。</span></div>}
              </div>
            </div>
          </section>

          {/* 全ファイターの絞り込み、使用状態の確認、略称/説明/登録状態の編集 */}
          <section className="section-block directory-section" aria-label="ファイター一覧">
            {directoryVisible && <div className="section-heading section-heading--directory">
              <div className="directory-title-row">
                <div className="section-title-wrap"><div><h2 id="directory-title">ファイター一覧</h2></div></div>
              </div>
            </div>}
            {directoryVisible && <>
              <div className="directory-controls">
                <label className="directory-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="略称で絞り込み..." aria-label="ファイターを略称で検索" />{search && <button type="button" onClick={() => setSearch("")} aria-label="検索をクリア"><X size={14} /></button>}</label>
                <label className="registered-filter"><input type="checkbox" checked={onlyRegistered} onChange={(event) => setOnlyRegistered(event.target.checked)} /><span>使用キャラのみ表示</span></label>
              </div>
              <div className="directory-table-wrap">
                <table className="fighter-table">
                  <thead><tr><th>ID</th><th>ファイター名</th><th>略称</th><th>使用</th><th>説明</th><th>編集</th></tr></thead>
                  <tbody>
                    {visibleCharacters.map((character) => {
                      const isEditing = editingCharacterId === character.id;
                      return <tr className={`${character.is_registered ? "fighter-table-row--registered" : ""}${character.id === targetCharacterId ? " fighter-table-row--target" : ""}`} key={character.id}>
                        <td className="fighter-id">{character.id}</td>
                        <td><button className="table-fighter-name" type="button" onClick={() => {
                          if (activeNotes.some((note) => note.target_character_id === character.id)) setTargetCharacterId(character.id);
                        }}><FighterPortrait character={character} /><span>{character.name}</span></button></td>
                        <td>{isEditing ? <input className="table-edit-input" value={characterDraft.nickname} maxLength={20} onChange={(event) => setCharacterDraft((current) => ({ ...current, nickname: event.target.value }))} aria-label={`${character.name}の略称`} /> : <span className="table-nickname">{character.nickname}</span>}</td>
                        <td>{isEditing ? <input className="table-registration-input" type="checkbox" checked={characterDraft.isRegistered} onChange={(event) => setCharacterDraft((current) => ({ ...current, isRegistered: event.target.checked }))} aria-label={`${character.name}の使用キャラ設定`} /> : character.is_registered ? <span className="registered-check" title="使用キャラ"><Check size={15} /></span> : <span className="not-registered" />}</td>
                        <td className="table-note-cell">{isEditing ? <textarea className="table-edit-note" value={characterDraft.note} onChange={(event) => setCharacterDraft((current) => ({ ...current, note: event.target.value }))} aria-label={`${character.name}の説明`} /> : <span title={character.note ?? ""}>{character.note || "—"}</span>}</td>
                        <td>{isEditing ? <span className="table-edit-actions"><button className="table-save" type="button" onClick={() => void saveCharacter(character)} disabled={savingCharacterId === character.id} aria-label="ファイター情報を更新"><Save size={15} /></button><button className="table-cancel" type="button" onClick={() => setEditingCharacterId(null)} aria-label="編集をキャンセル"><X size={15} /></button></span> : <button className="table-edit-button" type="button" onClick={() => beginCharacterEdit(character)} aria-label={`${character.name}を編集`} title="編集"><Pencil size={15} /></button>}</td>
                      </tr>;
                    })}
                    {visibleCharacters.length === 0 && <tr><td colSpan={6} className="table-empty">一致するファイターがいません。</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}
          </section>
          </div>

          <footer className="page-footer"><span>TERU PORTAL <span>·</span> SUMABURA NOTEBOOK</span><span>LOCAL WORKSPACE</span></footer>
        </main>
      </div>
    </div>
  );
}
