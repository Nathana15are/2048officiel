(() => {
const gridEl = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');
const movesEl = document.getElementById('moves');
const modeLabel = document.getElementById('modeLabel');
const menu = document.getElementById('menu');
const game = document.getElementById('game');
const backBtn = document.getElementById('backBtn');
const shareBtn = document.getElementById('shareBtn');
const msg = document.getElementById('msg');
const likeBtn = document.getElementById('likeBtn');
const likeCount = document.getElementById('likeCount');
const lbOverlay = document.getElementById('lbOverlay');
const lbOpen = document.getElementById('openLb');
const lbClose = document.getElementById('closeLb');
const lbModeSel = document.getElementById('lbMode');
const lbTable = document.getElementById('lbTable').querySelector('tbody');

// --- State ---
let size = 4;
let mode = 'classic';
let board = [];
let score = 0;
let moves = 0;
let gameOver = false;

// --- Storage helpers ---
const LS_KEYS = {
  BEST: 'v5_best_by_mode',
  LB: 'v5_leaderboard_by_mode',
  LIKE: 'v5_like_count'
};
function read(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch{ return fallback } }
function write(key, val){ localStorage.setItem(key, JSON.stringify(val)) }

// Likes
const likes = read(LS_KEYS.LIKE, 0);
likeCount.textContent = likes;
likeBtn.addEventListener('click', () => {
  let n = read(LS_KEYS.LIKE, 0) + 1;
  write(LS_KEYS.LIKE, n);
  likeCount.textContent = n;
  likeBtn.classList.add('liked');
  setTimeout(()=>likeBtn.classList.remove('liked'), 400);
});

// Start buttons
document.querySelectorAll('#menu .primary').forEach(btn => {
  btn.addEventListener('click', () => startGame(btn.dataset.mode));
});

backBtn.addEventListener('click', () => {
  game.classList.add('hidden');
  menu.classList.remove('hidden');
  shareBtn.classList.add('hidden');
  msg.textContent = '';
});

// Leaderboard open/close
lbOpen.addEventListener('click', () => { lbOverlay.classList.remove('hidden'); fillLeaderboard(lbModeSel.value); });
document.getElementById('closeLb').addEventListener('click', () => lbOverlay.classList.add('hidden'));
lbModeSel.addEventListener('change', () => fillLeaderboard(lbModeSel.value));

// --- Game core ---
function startGame(m){
  mode = m;
  size = (mode === 'hardcore') ? 5 : 4;
  gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  menu.classList.add('hidden');
  game.classList.remove('hidden');
  modeLabel.textContent = `Mode : ${m}`;
  board = Array.from({length:size}, () => Array(size).fill(0));
  score = 0; moves = 0; gameOver = false;
  msg.textContent = '';
  shareBtn.classList.add('hidden');

  addTile(); addTile();
  render(true);
  updateHUD();
}

function addTile(){
  const empty = [];
  for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(board[r][c]===0) empty.push([r,c]);
  if(!empty.length) return;
  const [r,c] = empty[Math.floor(Math.random()*empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function slideRowLeft(row){
  const arr = row.filter(v=>v!==0);
  for(let i=0;i<arr.length-1;i++){
    if(arr[i]===arr[i+1]){ arr[i]*=2; score += arr[i]; arr[i+1]=0; i++; }
  }
  const compact = arr.filter(v=>v!==0);
  while(compact.length<size) compact.push(0);
  return compact;
}

function rotateLeft(m){
  const n = m.length;
  const res = Array.from({length:n},()=>Array(n).fill(0));
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) res[n-1-c][r]=m[r][c];
  return res;
}
function rotateRight(m){
  const n = m.length;
  const res = Array.from({length:n},()=>Array(n).fill(0));
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) res[c][n-1-r]=m[r][c];
  return res;
}

function move(dir){ // 'left','right','up','down'
  if(gameOver) return;
  let b = board.map(row=>row.slice());
  if(dir==='right'){ b = b.map(row=>row.reverse()); }
  if(dir==='up'){ b = rotateLeft(b); }
  if(dir==='down'){ b = rotateRight(b); }

  let moved = false;
  b = b.map((row, idx) => {
    const before = row.slice();
    const after = slideRowLeft(row);
    if(!moved && before.some((v,i)=>v!==after[i])) moved = true;
    return after;
  });

  if(dir==='right'){ b = b.map(row=>row.reverse()); }
  if(dir==='up'){ b = rotateRight(b); }
  if(dir==='down'){ b = rotateLeft(b); }

  if(moved){
    board = b;
    addTile();
    moves++;
    render();
    updateHUD();
    if(!canMove()){
      endGame();
    }
  }
}

function canMove(){
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      if(board[r][c]===0) return true;
      if(c<size-1 && board[r][c]===board[r][c+1]) return true;
      if(r<size-1 && board[r][c]===board[r+1][c]) return true;
    }
  }
  // 'infinite' mode doesn't end automatically until blocked — same as others. End when blocked
  return false;
}

function endGame(){
  gameOver = true;
  shareBtn.classList.remove('hidden');
  msg.textContent = 'Partie terminée !';
  saveScore();
  pulse(gridEl);
}

function updateHUD(){
  scoreEl.textContent = String(score);
  movesEl.textContent = String(moves);
  const bestByMode = read(LS_KEYS.BEST, {classic:0,infinite:0,hardcore:0});
  if(score > (bestByMode[mode]||0)){ bestByMode[mode]=score; write(LS_KEYS.BEST, bestByMode); }
  bestEl.textContent = String((read(LS_KEYS.BEST,{classic:0,infinite:0,hardcore:0})[mode])||0);
}

function render(first=false){
  gridEl.innerHTML = '';
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      const v = board[r][c];
      const d = document.createElement('div');
      d.className = 'tile'+(first && v? ' new':'');
      if(v){ d.textContent = v; d.style.background = tileColor(v); }
      gridEl.appendChild(d);
    }
  }
}

function tileColor(v){
  const map = {
    2:'#2c3e50',4:'#34495e',8:'#16a085',16:'#27ae60',32:'#2980b9',64:'#8e44ad',
    128:'#e67e22',256:'#d35400',512:'#c0392b',1024:'#f1c40f',2048:'#00ffff',4096:'#ff00ff'
  };
  const col = map[v] || '#555';
  return `linear-gradient(145deg, ${col}, #00000066)`;
}

function saveScore(){
  const lb = read(LS_KEYS.LB, {classic:[],infinite:[],hardcore:[]});
  lb[mode].push({score, moves, date: new Date().toISOString()});
  lb[mode].sort((a,b)=> b.score - a.score || a.moves - b.moves);
  lb[mode] = lb[mode].slice(0,10);
  write(LS_KEYS.LB, lb);
}

function fillLeaderboard(m){
  const lb = read(LS_KEYS.LB, {classic:[],infinite:[],hardcore:[]});
  const rows = lb[m];
  lbTable.innerHTML = '';
  if(!rows || rows.length===0){
    lbTable.innerHTML = '<tr><td colspan="4">Aucun score pour ce mode… joue une partie !</td></tr>';
    return;
  }
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    const d = new Date(r.date);
    tr.innerHTML = `<td>${i+1}</td><td>${r.score}</td><td>${r.moves}</td><td>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</td>`;
    lbTable.appendChild(tr);
  });
}

// Keyboard
document.addEventListener('keydown', e => {
  if(menu.classList.contains('hidden')){
    if(e.key==='ArrowLeft') move('left');
    if(e.key==='ArrowRight') move('right');
    if(e.key==='ArrowUp') move('up');
    if(e.key==='ArrowDown') move('down');
  }
});

// Swipe only on grid
let sx=0, sy=0;
gridEl.addEventListener('touchstart', e=>{
  const t = e.changedTouches[0]; sx=t.clientX; sy=t.clientY;
}, {passive:true});
gridEl.addEventListener('touchend', e=>{
  const t = e.changedTouches[0]; const dx=t.clientX-sx; const dy=t.clientY-sy;
  if(Math.abs(dx) > Math.abs(dy)){
    if(dx>30) move('right'); else if(dx<-30) move('left');
  }else{
    if(dy>30) move('down'); else if(dy<-30) move('up');
  }
}, {passive:true});

// Share
shareBtn.addEventListener('click', async () => {
  const url = location.href;
  const text = `J'ai fait un score de ${score} sur 2048 Ultra Deluxe (mode ${mode}) 🚀` + (url ? `\nViens me battre : ${url}` : '');
  if(navigator.share){
    try{ await navigator.share({title:'Mon score 2048', text}); }
    catch{ /* annulé */ }
  }else{
    try{
      await navigator.clipboard.writeText(text);
      msg.textContent = '✅ Score copié dans le presse-papier !';
    }catch{
      msg.textContent = text; // fallback ultra simple
    }
  }
});

// Small pulse effect
function pulse(el){
  el.animate([{transform:'scale(1)'},{transform:'scale(1.02)'},{transform:'scale(1)'}], {duration:300, easing:'ease'});
}

// --- Particles background ---
const cvs = document.getElementById('bgCanvas');
const ctx = cvs.getContext('2d');
function resize(){ cvs.width = innerWidth; cvs.height = innerHeight; }
addEventListener('resize', resize); resize();
const P = Array.from({length:70}, () => ({
  x: Math.random()*cvs.width,
  y: Math.random()*cvs.height,
  r: Math.random()*2+0.8,
  dx: (Math.random()-.5)*0.6,
  dy: (Math.random()-.5)*0.6,
  c: ['#0ff','#ff0','#f0f','#fff'][Math.floor(Math.random()*4)]
}));
function loop(){
  ctx.clearRect(0,0,cvs.width,cvs.height);
  for(const p of P){
    p.x+=p.dx; p.y+=p.dy;
    if(p.x<0||p.x>cvs.width) p.dx*=-1;
    if(p.y<0||p.y>cvs.height) p.dy*=-1;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = p.c; ctx.shadowBlur=8; ctx.shadowColor=p.c; ctx.fill();
  }
  requestAnimationFrame(loop);
}
loop();

})();