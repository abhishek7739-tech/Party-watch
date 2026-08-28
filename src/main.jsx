import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import './styles.css';
import './layout-overrides.css';
import Auth from './auth.jsx';

// Leave this unset in development to use Vite's /socket.io proxy. In production,
// VITE_SOCKET_URL must point to the separately deployed Socket.IO server.
const socketServerUrl = import.meta.env.VITE_SOCKET_URL?.trim().replace(/\/$/, '') || undefined;
const apiServerUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') || socketServerUrl || '';
const socket = io(socketServerUrl, { autoConnect: false });
const initialForm = { title: 'Friday movie night', code: '' };


const extractVideoId = (value) => {
  const input = value.trim();
  if (/^[\w-]{11}$/.test(input)) return input;
  try { 
    const url = new URL(input); 
    return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop()?.slice(0, 11) || ''; 
  } catch { return ''; }
};


const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function YouTubePlayer({ playback, onAction }) {
  const host = useRef(null);
  const player = useRef(null); 
  const applying = useRef(false); 
  const playbackRef = useRef(playback);
  
  useEffect(() => { playbackRef.current = playback; }, [playback]);

  useEffect(() => {
    if (window.YT?.Player) return create();
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; document.body.append(script);
    window.onYouTubeIframeAPIReady = create;
    return () => { window.onYouTubeIframeAPIReady = null; };
    function create() {
      if (player.current || !host.current) return;
      player.current = new window.YT.Player(host.current, { height: '100%', width: '100%', videoId: playbackRef.current.videoId, playerVars: { controls: 0, rel: 0, modestbranding: 1 }, events: {
        onReady: () => apply(playbackRef.current),
        onStateChange: (event) => {
          if (applying.current) return;
          if (event.data === window.YT.PlayerState.PLAYING) onAction('play', player.current.getCurrentTime());
          if (event.data === window.YT.PlayerState.PAUSED) onAction('pause', player.current.getCurrentTime());
        },
      } });
    }
  }, []);
  const apply = useCallback((next) => {
    if (!player.current?.getPlayerState) return;
    applying.current = true;

    // seekTo controls only the current video. A changed room video needs to be
    // explicitly loaded through the YouTube IFrame API first.
    const loadedVideoId = player.current.getVideoData?.().video_id;
    if (next.videoId && loadedVideoId !== next.videoId) {
      const video = { videoId: next.videoId, startSeconds: next.currentTime };
      if (next.isPlaying) player.current.loadVideoById(video);
      else player.current.cueVideoById(video);
      setTimeout(() => { applying.current = false; }, 700);
      return;
    }

    const current = player.current.getCurrentTime?.() || 0;
    if (Math.abs(current - next.currentTime) > 0.8) player.current.seekTo(next.currentTime, true);
    if (next.isPlaying) player.current.playVideo(); else player.current.pauseVideo();
    setTimeout(() => { applying.current = false; }, 300);
  }, []);
  useEffect(() => { apply(playback); }, [playback.videoId, playback.isPlaying, playback.updatedAt]);
  return <div className="player-shell"><div ref={host} className="youtube-player" />{!playback.videoId && <div className="player-empty"><span className="empty-icon">▶</span><h2>Choose a YouTube video</h2><p>Hosts and moderators can add a link below.</p></div>}</div>;
}

function Landing({ submit, error, loading, logout }) {
  const [form, setForm] = useState(initialForm); 
  const [mode, setMode] = useState('create');
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const go = (e) => { e.preventDefault(); submit(mode, form); };
  return <main className="landing"><section className="brand"><div className="logo">W</div><span>watchwave</span><button className="logout" onClick={logout}>Log out</button></section><div className="hero-copy"><p className="eyebrow">SYNCED STREAMING, HUMAN MOMENTS</p><h1>Your people.<br /><i>One</i> timeline.</h1><p className="lede">Start a private YouTube room and watch together from anywhere. Every play, pause and laugh stays in sync.</p><div className="features"><span>◉ Live sync</span><span>◌ Private rooms</span><span>✦ Account protected</span></div></div><form className="join-card" onSubmit={go}><div className="segmented"><button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Create a party</button><button type="button" className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Join a party</button></div><h2>{mode === 'create' ? 'Bring the crew together.' : 'You’re invited.'}</h2><p>{mode === 'create' ? 'Set up your private room in seconds.' : 'Enter the code shared by your host.'}</p>{mode === 'create' ? <label>PARTY NAME<input value={form.title} onChange={change('title')} placeholder="Friday movie night" maxLength="60" /></label> : <label>ROOM CODE<input value={form.code} onChange={change('code')} placeholder="ABC123" maxLength="6" required /></label>}{error && <div className="form-error">{error}</div>}<button className="primary" disabled={loading}>{loading ? 'Connecting…' : mode === 'create' ? 'Create watch party →' : 'Join watch party →'}</button></form><footer>Built for the group chat that never sleeps.</footer></main>;
}

function Room({ room, selfId, notify, leave, logout }) {
  const [playback, setPlayback] = useState(room.playback); 
  const [members, setMembers] = useState(room.members); 
  const [chat, setChat] = useState(room.chat); 
  const [video, setVideoText] = useState(''); 
  const [message, setMessage] = useState(''); 
  const [copied, setCopied] = useState(false);
  const self = members.find((member) => member.id === selfId); 
  const permitted = ['host', 'moderator'].includes(self?.role);


  useEffect(() => {
    const state = (next) => { 
      setPlayback(next.playback); 
      setMembers(next.members); 
      setChat(next.chat); 
    };
    const update = (next) => setPlayback(next);
    const messageEvent = (next) => setChat((items) => [...items, next]);
    socket.on('room:state', state); 
    socket.on('playback:update', update); 
    socket.on('chat:message', messageEvent);
    return () => {
       socket.off('room:state', state); 
       socket.off('playback:update', update); 
       socket.off('chat:message', messageEvent); 
      };
  }, []);

  const act = (action, currentTime = playback.currentTime) => { 
    if (!permitted) return notify('You are watching as a guest. Ask a host for control.'); 
    socket.emit('playback:action', { action, currentTime 
    }); 
  };
  const setVideo = (e) => { 
    e.preventDefault(); 
    const videoId = extractVideoId(video); 
    if (!videoId) return notify('Paste a valid YouTube URL or 11-character video ID.'); 
    socket.emit('video:set', { videoId }); 
    setVideoText(''); 
  };
  const send = (e) => { 
    e.preventDefault(); 
    if (!message.trim()) return; 
    socket.emit('chat:send', { text: message }); 
    setMessage(''); 
  };
  const copy = async () => { 
    await navigator.clipboard?.writeText(room.code); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 1800); 
  };
  return <main className="room"><header className="topbar"><div className="brand"><div className="logo">W</div><span>watchwave</span><em>β</em></div><div className="room-name"><span>{room.title}</span><button onClick={copy} className="code">{room.code} {copied ? 'COPIED' : 'COPY'}</button></div><div className="session-actions"><button onClick={leave} className="leave">Leave</button><button onClick={logout} className="leave">Log out</button></div></header><section className="watch"><div className="video-column">{permitted && <form className="video-input" onSubmit={setVideo}><input value={video} onChange={(e) => setVideoText(e.target.value)} placeholder="Paste a YouTube link to change the video" /><button>Load video</button></form>}<YouTubePlayer playback={playback} onAction={act} /><div className="controls"><button disabled={!permitted || !playback.videoId} className="play" onClick={() => act(playback.isPlaying ? 'pause' : 'play')}>{playback.isPlaying ? 'Ⅱ Pause for everyone' : '▶ Play for everyone'}</button><button disabled={!permitted || !playback.videoId} onClick={() => act('seek', Math.max(0, playback.currentTime - 10))}>↶ 10</button><span>{formatTime(playback.currentTime)} · {playback.isPlaying ? 'Playing' : 'Paused'}</span><button disabled={!permitted || !playback.videoId} onClick={() => act('seek', playback.currentTime + 10)}>10 ↷</button></div>{!permitted && <p className="permission-note">You’re a <b>{self?.role}</b>. Playback is controlled by the hosts.</p>}</div><aside className="side-panel"><Members members={members} self={self} canManage={self?.role === 'host'} /><div className="chat"><div className="side-title">CHAT <span>{chat.length}</span></div><div className="messages">{chat.length ? chat.map((item) => <article key={item.id}><b>{item.name}</b><p>{item.text}</p></article>) : <p className="quiet">Break the ice. Say hello!</p>}</div><form onSubmit={send}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message everyone…" maxLength="400" /><button aria-label="Send message">↑</button></form></div></aside></section></main>;
}

function Members({ members, self, canManage }) { return <div className="members"><div className="side-title">IN THE ROOM <span>{members.length}</span></div>{members.map((member) => <div className="member" key={member.id}><div className="avatar">{member.name[0]?.toUpperCase()}</div><div><b>{member.name}{member.id === self?.id && ' (you)'}</b><small>{member.role}</small></div>{canManage && member.id !== self?.id && member.role !== 'host' && <select value={member.role} onChange={(e) => e.target.value === 'host' ? socket.emit('member:transfer', { id: member.id }) : socket.emit('member:role', { id: member.id, role: e.target.value })}><option value="moderator">Moderator</option><option value="participant">Participant</option><option value="viewer">Viewer</option><option value="host">Transfer host</option></select>}</div>)}</div>; }

function App() {
  const [room, setRoom] = useState(null);
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem('watchwave-session')); } catch { return null; } }); 
  const [selfId, setSelfId] = useState(null); 
  const [error, setError] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [notice, setNotice] = useState('');

  useEffect(() => { 
    const fail = (message) => setNotice(message); 
    socket.on('room:error', fail); socket.on('room:removed', (message) => { setRoom(null); 
    setNotice(message); }); return () => { socket.off('room:error', fail); 
        socket.off('room:removed'); 
    };
  }, []);

  const submit = (mode, form) => { 
    if (!session?.token) return;
    const handleConnectError = (connectionError) => {
      setLoading(false);
      setError(connectionError.message === 'Authentication required' ? 'Your session has expired. Please log out and sign in again.' : 'Unable to connect to the party server. Please try again.');
    };
    socket.once('connect_error', handleConnectError);
    socket.auth = { token: session.token };
    setError(''); setLoading(true); 
    socket.connect(); socket.emit(mode === 'create' ? 'room:create' : 'room:join', mode === 'create' ? form : { name: form.name, code: form.code }, (response) => {
      socket.off('connect_error', handleConnectError);
      setLoading(false);
      if (response?.error) return setError(response.error);
      setRoom(response.room);
      setSelfId(response.selfId);
    });
  };

  const authenticate = (next) => { localStorage.setItem('watchwave-session', JSON.stringify(next)); setSession(next); };
  const leave = () => { 
    socket.disconnect(); 
    setRoom(null); 
    setSelfId(null); };
  const logout = () => {
    socket.disconnect();
    socket.auth = {};
    localStorage.removeItem('watchwave-session');
    setRoom(null);
    setSelfId(null);
    setError('');
    setNotice('');
    setSession(null);
  };
  if (!session?.token) return <Auth apiServerUrl={apiServerUrl} onAuthenticated={authenticate} />;
  return <>{room ? <Room room={room} selfId={selfId} notify={setNotice} leave={leave} logout={logout} /> : <Landing submit={submit} error={error || notice} loading={loading} logout={logout} />}{notice && room && <button className="toast" onClick={() => setNotice('')}>{notice} ×</button>}</>;
}
createRoot(document.getElementById('root')).render(<App />);
