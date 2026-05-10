import { useState, useEffect, useRef } from 'react';
import { Sword, Crosshair, Target, Bomb, Music, Bug, Settings, Zap, Trash2, Search, Image as ImageIcon, AlertTriangle, PlusCircle, ExternalLink, Activity, ArrowLeftRight, Calculator, Swords, SlidersHorizontal, Flame, Droplet, Snowflake, PawPrint, HelpCircle, Star, Scale, Upload, Youtube, Coffee, Loader2 } from 'lucide-react';
// @ts-ignore
import Tesseract from 'tesseract.js';

import SavedBuilds from './components/SavedBuilds';
import OcrModal from './components/OcrModal';

// 請把下面的網址換成你的 Cloudflare Worker 網址
const CLOUDFLARE_WORKER_URL = 'mhngt111.ragnaroktactics111.workers.dev';

export default function App() {
  const [appData, setAppData] = useState<{skills: any[], constants: any} | null>(null);

  useEffect(() => {
    // @ts-ignore
    const baseUrl = import.meta.env.MODE === 'development' ? '' : CLOUDFLARE_WORKER_URL;
    
    Promise.all([
      fetch(`${baseUrl}/api/skills`).then(res => res.json()),
      fetch(`${baseUrl}/api/constants`).then(res => res.json())
    ]).then(([skills, constants]) => {
      setAppData({ skills, constants });
    }).catch(err => {
      console.error("Failed to fetch app data", err);
      // Fallback or show error
      alert("載入資料失敗，請確認後端連線正常。");
    });
  }, []);

  const [selectedWeapon, setSelectedWeapon] = useState('片手劍');
  const [selectedElement, setSelectedElement] = useState('None');
  const [saPhialType, setSaPhialType] = useState('other');
  const [saMode, setSaMode] = useState('axe');
  const [cbPhialType, setCbPhialType] = useState('impact');
  const [selectedBowShotType, setSelectedBowShotType] = useState('other');
  const [glType, setGlType] = useState('normal');
  const [glGrade, setGlGrade] = useState(1);
  const [bowgunAmmoType, setBowgunAmmoType] = useState('other');
  const [hhBuffs, setHhBuffs] = useState<Set<string>>(new Set());
  const [igType, setIgType] = useState('dust');
  const [igAction, setIgAction] = useState('');
  
  const [selectedSkills, setSelectedSkills] = useState<Record<string, number>>({});
  const [skillSearch, setSkillSearch] = useState('');
  
  const [inputs, setInputs] = useState({
    baseAtk: 1725,
    elementAtk: 1968,
    hp: 100,
    hitzone: 130,
    actionValue: 37,
    critRate: 0,
    sp: false,
    sleep: false,
    para: false,
    poison: false,
    aerial: false,
    lsRed: false,
    cbRed: false,
    saRed: false,
    bowC3: false,
    glGroundSplitter: false,
    glBlue: false,
    glGuard: false,
    eleWeak: false,
    hbgGlow: false,
    hbgRed: false,
    abnormal: false,
    igFullAssist: false,
    igEleUp: false
  });

  const [savedBuilds, setSavedBuilds] = useState<any[]>([]);
  const [activeBaselineId, setActiveBaselineId] = useState<number | null>(null);

  const [results, setResults] = useState<any>(null);

  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    const calcInputs = {
      ...inputs,
      weapon: selectedWeapon,
      element: selectedElement,
      saPhial: saPhialType,
      saMode,
      cbPhial: cbPhialType,
      bowShot: selectedBowShotType,
      glType,
      glGrade,
      bgAmmo: bowgunAmmoType,
      igType,
      igAction
    };
    
    // @ts-ignore
    const apiUrl = import.meta.env.MODE === 'development' ? '/api/calculate' : `${CLOUDFLARE_WORKER_URL}/api/calculate`;
    
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: calcInputs,
          selectedSkills,
          hhBuffsArray: Array.from(hhBuffs)
        })
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Calculation API error:", err);
      alert("計算時發生錯誤，請稍後再試或檢查網路連線。");
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('mhn_saved_builds');
    if (stored) {
      try {
        setSavedBuilds(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const saveBuilds = (builds: any[]) => {
    setSavedBuilds(builds);
    localStorage.setItem('mhn_saved_builds', JSON.stringify(builds));
  };

  const handleInputChange = (field: string, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadTime = useRef<number>(0);

  const handleImageFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const now = Date.now();
    const UPLOAD_COOLDOWN = 8000; // 8秒限制
    if (now - lastUploadTime.current < UPLOAD_COOLDOWN) {
        const remaining = Math.ceil((UPLOAD_COOLDOWN - (now - lastUploadTime.current)) / 1000);
        alert(`上傳過於頻繁，為保護系統請等待 ${remaining} 秒後再試。`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('基於安全考量，只能上傳圖片檔案！');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('圖片檔案過大 (限制 10MB 以下)，請重新選擇。');
        return;
    }

    lastUploadTime.current = now;
    setOcrFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const calculateFormatDamage = (num: number) => {
    if (typeof num !== 'number' || isNaN(num)) return "N/A";
    return Math.round(num).toLocaleString();
  };

  const loadBuild = (id: number) => {
    const build = savedBuilds.find(b => b.id === id);
    if (!build) return;

    setSelectedWeapon(build.weapon);
    setSelectedElement(build.element);
    setSelectedSkills(build.skills ? JSON.parse(JSON.stringify(build.skills)) : {});
    
    const i = build.inputs;
    if (i) {
        setInputs(prev => ({
            ...prev,
            baseAtk: i.baseAtk !== undefined ? i.baseAtk : prev.baseAtk,
            elementAtk: i.elementAtk !== undefined ? i.elementAtk : prev.elementAtk,
            hp: i.hp !== undefined ? i.hp : prev.hp,
            hitzone: i.hitzone !== undefined ? i.hitzone : prev.hitzone,
            actionValue: i.actionValue !== undefined ? i.actionValue : prev.actionValue,
            critRate: i.critRate !== undefined ? i.critRate : prev.critRate,
            sp: !!i.sp,
            sleep: !!i.sleep,
            para: !!i.para,
            poison: !!i.poison,
            aerial: !!i.aerial,
            lsRed: !!i.lsRed,
            cbRed: !!i.cbRed,
            saRed: !!i.saRed,
            bowC3: !!i.bowC3,
            glGroundSplitter: !!i.glGroundSplitter,
            glBlue: !!i.glBlue,
            glGuard: !!i.glGuard,
            eleWeak: !!i.eleWeak,
            hbgGlow: !!i.hbgGlow,
            hbgRed: !!i.hbgRed,
            abnormal: !!i.abnormal,
            igFullAssist: !!i.igFullAssist,
            igEleUp: !!i.igEleUp
        }));
        
        if (i.saPhial) setSaPhialType(i.saPhial);
        if (i.saMode) setSaMode(i.saMode);
        if (i.cbPhial) setCbPhialType(i.cbPhial);
        if (i.bowShot) setSelectedBowShotType(i.bowShot);
        if (i.glType) setGlType(i.glType);
        if (i.glGrade) setGlGrade(i.glGrade);
        if (i.bgAmmo) setBowgunAmmoType(i.bgAmmo);
        if (i.igType) setIgType(i.igType);
        if (i.igAction) setIgAction(i.igAction);
        // Note: hhBuffs wasn't fully stored in previous logic structure, omitted here to save lines or we could restore it
    }
    document.getElementById('weapon-selection-header')?.scrollIntoView({ behavior: 'smooth' });
  };

  const deleteBuild = (id: number) => {
    const updated = savedBuilds.filter(b => b.id !== id);
    if (activeBaselineId === id) setActiveBaselineId(null);
    saveBuilds(updated);
  };

  const updateBuildName = (id: number, name: string) => {
    const updated = savedBuilds.map(b => b.id === id ? { ...b, name } : b);
    saveBuilds(updated);
  };

  const setAsBase = (id: number) => {
    setActiveBaselineId(activeBaselineId === id ? null : id);
  };

  const clearAllBuilds = () => {
    saveBuilds([]);
    setActiveBaselineId(null);
  };

  if (!appData) {
    return (
      <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-lg font-bold">載入武器參數與技能資料中...</p>
      </div>
    );
  }

  const { WEAPONS, BOW_MVS, GL_SHELLING, BOWGUN_MVS, BOW_HITS, BOWGUN_HITS, BOW_TYPE_NAMES, BG_AMMO_NAMES } = appData.constants;
  const SKILL_DATA = appData.skills;

  return (
    <div className="bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gray-900 p-4 sm:p-6 border-b border-gray-700 flex flex-col gap-4 relative">
        <div className="flex flex-row justify-between items-center gap-2">
            <h1 className="text-lg sm:text-3xl font-black text-white tracking-wider flex items-center shrink">
                <Sword className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-red-500 shrink-0" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 truncate">MHN 傷害計算器</span>
            </h1>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ml-1 mb-2">
            <div className="flex items-center gap-3">
                <img src="https://yt3.googleusercontent.com/h9ge3UcU46sXUqwBI3z1D-_VGXTUJmwMa2vBPxLfT5Bov9pnLWsKe6mX8bTvJz-YzhXm0rZwYg=s160-c-k-c0x00ffffff-no-rj" alt="Avatar" className="w-12 h-12 rounded-full border-2 border-gray-500 object-cover shadow-lg shrink-0" />
                <span className="text-lg text-gray-200 font-bold tracking-wide">GAMETIME尋樂</span>
            </div>
            <div className="flex items-center gap-3">
                <a href="https://www.youtube.com/@GameTime2019?sub_confirmation=1" target="_blank" className="flex items-center gap-1.5 bg-[#FF0000] hover:bg-red-700 text-white px-3 py-1.5 rounded-full transition-all duration-200 shadow-md group hover:scale-105 active:scale-95 shrink-0">
                    <span className="text-sm font-bold">Subscribe YouTube</span>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61551540704718" target="_blank" className="flex items-center gap-1.5 bg-[#1877F2] hover:bg-blue-700 text-white px-3 py-1.5 rounded-full transition-all duration-200 shadow-md group hover:scale-105 active:scale-95 shrink-0">
                    <span className="text-sm font-bold">Facebook</span>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61551540704718" target="_blank" className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-full transition-all duration-200 shadow-md group hover:scale-105 active:scale-95 shrink-0">
                    <span className="text-sm font-bold">贊助</span>
                </a>
            </div>
        </div>
        <div className="absolute bottom-1 right-2 text-[10px] text-gray-600 font-mono">V102 React Version</div>
      </div>
      
      {/* App body */}
      <div className="p-4 sm:p-8">
        
        {/* Current Weapon Display */}
        <div className="bg-red-800/20 border-l-4 border-red-500 p-4 sm:p-6 rounded-lg mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-red-300 flex items-center mb-1">
                <span className="text-yellow-400 mr-4"><Crosshair className="w-8 h-8 sm:w-10 sm:h-10" /></span>
                <span className="text-3xl sm:text-4xl font-black text-white tracking-wide">{selectedWeapon}</span>
            </h2>
        </div>

        {/* Weapon Selection */}
        <div className="mb-10">
            <h2 id="weapon-selection-header" className="text-xl font-bold text-gray-300 mb-4 flex items-center scroll-mt-24">
                <span className="bg-red-600 w-2 h-6 mr-3 rounded-sm"></span> <span>選擇武器種類</span>
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 sm:gap-4 p-2">
                {WEAPONS.map(w => (
                    <div 
                      key={w} 
                      onClick={() => setSelectedWeapon(w)}
                      className={`relative h-16 sm:h-20 w-full rounded-lg flex flex-col items-center justify-center transition-all duration-200 cursor-pointer group overflow-hidden select-none border-2 ${w === selectedWeapon ? "bg-blue-500/80 border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] backdrop-blur-md z-20 text-white" : "bg-gray-800 border-gray-600 hover:bg-gray-750 text-gray-400"}`}
                    >
                      <span className={`${w === selectedWeapon ? 'text-lg font-black' : 'text-sm font-bold'} text-center w-full block`}>{w}</span>
                    </div>
                ))}
            </div>
            
            {selectedWeapon === '弓箭' && (
              <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-teal-900/50">
                  <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wide mb-3 flex items-center"><Target className="w-4 h-4 mr-2" /><span>弓箭設定</span></h3>
                  <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                          {['pierce1','pierce2','pierce3','pierce4'].map(bt => <button key={bt} onClick={() => { setSelectedBowShotType(bt); handleInputChange('actionValue', BOW_MVS[bt]?.normal || 0); }} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${selectedBowShotType === bt ? 'bg-teal-600 text-white font-bold border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{BOW_TYPE_NAMES[bt]}</button>)}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                          {['rapid1','rapid2','rapid3','rapid4'].map(bt => <button key={bt} onClick={() => { setSelectedBowShotType(bt); handleInputChange('actionValue', BOW_MVS[bt]?.normal || 0); }} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${selectedBowShotType === bt ? 'bg-teal-600 text-white font-bold border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{BOW_TYPE_NAMES[bt]}</button>)}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                          {['spread1','spread2','spread3','spread4'].map(bt => <button key={bt} onClick={() => { setSelectedBowShotType(bt); handleInputChange('actionValue', BOW_MVS[bt]?.normal || 0); }} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${selectedBowShotType === bt ? 'bg-teal-600 text-white font-bold border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{BOW_TYPE_NAMES[bt]}</button>)}
                      </div>
                      <div className="grid grid-cols-1 gap-2"><button onClick={() => setSelectedBowShotType('other')} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${selectedBowShotType === 'other' ? 'bg-teal-600 text-white font-bold border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>其他招式</button></div>
                  </div>
              </div>
            )}
            
            {selectedWeapon === '銃槍' && (
              <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-amber-900/50">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide mb-3 flex items-center"><Bomb className="w-4 h-4 mr-2" /><span>銃槍設定</span></h3>
                  <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                          {['normal','long','wide','other'].map(gt => <button key={gt} onClick={() => setGlType(gt)} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${glType === gt ? 'bg-amber-600 text-white font-bold border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{gt === 'normal' ? '通常型' : gt === 'long' ? '放射型' : gt === 'wide' ? '擴散型' : '其他招式'}</button>)}
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                          {[1,2,3,4,5,6,7,8,9,10].map(lvl => <button key={lvl} onClick={() => setGlGrade(lvl)} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${glGrade === lvl ? 'bg-amber-600 text-white font-bold border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>G{lvl}</button>)}
                      </div>
                  </div>
              </div>
            )}
            
            {(selectedWeapon === '輕弩' || selectedWeapon === '重弩') && (
              <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-indigo-900/50">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wide mb-3 flex items-center"><Crosshair className="w-4 h-4 mr-2" /><span>彈藥設定</span></h3>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {['pierce','spread','sticky','slicing','cluster','wyvern','other'].map(at => <button key={at} onClick={() => { setBowgunAmmoType(at); const v = BOWGUN_MVS[at]; if (at !== 'wyvern' && v !== null) handleInputChange('actionValue', v); }} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${bowgunAmmoType === at ? 'bg-indigo-600 text-white font-bold border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{BG_AMMO_NAMES[at] || '其他'}</button>)}
                  </div>
              </div>
            )}
            
            {selectedWeapon === '狩獵笛' && (
              <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-pink-900/50">
                  <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wide mb-4 flex items-center"><Music className="w-4 h-4 mr-2" /> <span>旋律效果</span></h3>
                  <div className="space-y-4">
                      <div>
                          <p className="text-xs text-pink-200/80 mb-2 font-semibold tracking-wide">攻擊旋律</p>
                          <div className="grid grid-cols-2 gap-2">
                              {['atk_s','atk_l'].map(b => <button key={b} onClick={() => setHhBuffs(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; })} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${hhBuffs.has(b) ? 'bg-pink-600 text-white font-bold border-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{b === 'atk_s' ? '攻擊 (小)' : '攻擊 (大)'}</button>)}
                          </div>
                      </div>
                      <div>
                          <p className="text-xs text-pink-200/80 mb-2 font-semibold tracking-wide">屬性旋律</p>
                          <div className="grid grid-cols-5 gap-2 mb-2">
                              {['fire_up','water_up','thunder_up','ice_up','dragon_up'].map(b => <button key={b} onClick={() => setHhBuffs(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; })} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${hhBuffs.has(b) ? 'bg-pink-600 text-white font-bold border-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{b.replace('_up','').replace('fire','火').replace('water','水').replace('thunder','雷').replace('ice','冰').replace('dragon','龍')}</button>)}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              {['ele_s','ele_l'].map(b => <button key={b} onClick={() => setHhBuffs(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; })} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${hhBuffs.has(b) ? 'bg-pink-600 text-white font-bold border-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{b === 'ele_s' ? '全屬性 (小)' : '全屬性 (大)'}</button>)}
                          </div>
                      </div>
                  </div>
              </div>
            )}
            
            {selectedWeapon === '操蟲棍' && (
              <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-emerald-900/50">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-3 flex items-center"><Bug className="w-4 h-4 mr-2" /> <span>操蟲棍設定</span></h3>
                  <div className="space-y-4">
                      <div className="flex space-x-2">
                          <button onClick={() => setIgType('dust')} className={`px-3 py-2 rounded flex-1 border font-medium transition-colors cursor-pointer ${igType === 'dust' ? 'bg-yellow-600 text-white border-yellow-400 shadow-[0_0_8px_rgba(202,138,4,0.5)]' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'}`}>粉塵</button>
                          <button onClick={() => setIgType('aerial')} className={`px-3 py-2 rounded flex-1 border font-medium transition-colors cursor-pointer ${igType === 'aerial' ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'}`}>飛翔</button>
                          <button onClick={() => setIgType('assist')} className={`px-3 py-2 rounded flex-1 border font-medium transition-colors cursor-pointer ${igType === 'assist' ? 'bg-red-600 text-white border-red-400 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'bg-gray-700 text-gray-300 border-transparent hover:bg-gray-600'}`}>共鬥</button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                          {['normal_dust','strong_dust','chain_dust','other'].map(act => <button key={act} onClick={() => { setIgAction(act); if(act === 'normal_dust') { handleInputChange('actionValue', 43.3); handleInputChange('hitzone', 130); } else if (act === 'strong_dust') { handleInputChange('actionValue', 130); handleInputChange('hitzone', 130); } else if (act === 'chain_dust') { handleInputChange('actionValue', 129); handleInputChange('hitzone', 130); } }} className={`px-2 py-2 rounded text-xs transition-colors font-medium border ${igAction === act ? 'bg-emerald-600 text-white font-bold border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'}`}>{act === 'normal_dust' ? '普通粉' : act === 'strong_dust' ? '強粉塵' : act === 'chain_dust' ? '連爆粉' : '其他'}</button>)}
                      </div>
                  </div>
              </div>
            )}
            
            {selectedWeapon === '斬擊斧' && (
              <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-orange-900/50">
                  <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide mb-3 flex items-center"><span>斬擊斧專用</span></h3>
                  <div className="space-y-4">
                      <div className="flex space-x-2">
                          <button onClick={() => setSaPhialType('power')} className={`px-3 py-2 flex-1 rounded hover:bg-gray-600 border border-transparent ${saPhialType === 'power' ? 'bg-orange-600 text-white font-bold' : 'bg-gray-700 text-gray-300'}`}>強擊瓶</button>
                          <button onClick={() => setSaPhialType('element')} className={`px-3 py-2 flex-1 rounded hover:bg-gray-600 border border-transparent ${saPhialType === 'element' ? 'bg-orange-600 text-white font-bold' : 'bg-gray-700 text-gray-300'}`}>強屬性瓶</button>
                          <button onClick={() => setSaPhialType('other')} className={`px-3 py-2 flex-1 rounded hover:bg-gray-600 border border-transparent ${saPhialType === 'other' ? 'bg-orange-600 text-white font-bold' : 'bg-gray-700 text-gray-300'}`}>其他瓶</button>
                      </div>
                      <div className="flex space-x-2">
                          <button onClick={() => setSaMode('axe')} className={`px-3 py-2 flex-1 rounded border border-transparent hover:bg-gray-600 ${saMode === 'axe' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-700 text-gray-300'}`}>🪓 斧攻擊</button>
                          <button onClick={() => setSaMode('sword')} className={`px-3 py-2 flex-1 rounded border border-transparent hover:bg-gray-600 ${saMode === 'sword' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-700 text-gray-300'}`}>⚔️ 劍攻擊</button>
                      </div>
                      <p className="text-red-400 text-xs mt-2 font-semibold">斧轉劍變形斬是劍攻擊, 動作值為41</p>
                  </div>
              </div>
            )}
            
            {selectedWeapon === '充能斧' && (
              <div className="mt-4 p-4 bg-gray-700/40 rounded-lg border border-yellow-900/50">
                  <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wide mb-3 flex items-center"><span>充能斧專用</span></h3>
                  <div className="flex space-x-2">
                      <button onClick={() => setCbPhialType('impact')} className={`px-3 py-2 flex-1 rounded hover:bg-gray-600 border border-transparent ${cbPhialType === 'impact' ? 'bg-yellow-600 text-white font-bold' : 'bg-gray-700 text-gray-300'}`}>榴彈瓶</button>
                      <button onClick={() => setCbPhialType('element')} className={`px-3 py-2 flex-1 rounded hover:bg-gray-600 border border-transparent ${cbPhialType === 'element' ? 'bg-yellow-600 text-white font-bold' : 'bg-gray-700 text-gray-300'}`}>強屬性瓶</button>
                  </div>
              </div>
            )}
        </div>
        
        {/* Parameter Settings */}
        <div id="parameters-area" className="mb-10 bg-gray-700/50 p-6 rounded-xl border border-gray-600 scroll-mt-4">
            <h2 className="text-xl font-bold text-gray-300 mb-5 flex items-center"><Settings className="w-6 h-6 mr-3 text-gray-400" /><span>參數設定</span></h2>
            
            <div className="mb-6 pb-4 border-b border-gray-600">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wide mb-3">武器屬性選擇</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                        { name: "無(含異常武器)", value: "None", icon: <HelpCircle className="w-5 h-5 mb-1" />, hint: "包括所有異常武器", twC: "gray" }, 
                        { name: "火", value: "Fire", icon: <Flame className="w-5 h-5 mb-1" />, twC: "red" }, 
                        { name: "水", value: "Water", icon: <Droplet className="w-5 h-5 mb-1" />, twC: "blue" }, 
                        { name: "雷", value: "Thunder", icon: <Zap className="w-5 h-5 mb-1" />, twC: "yellow" }, 
                        { name: "冰", value: "Ice", icon: <Snowflake className="w-5 h-5 mb-1" />, twC: "cyan" }, 
                        { name: "龍", value: "Dragon", icon: <PawPrint className="w-5 h-5 mb-1" />, twC: "purple" }
                    ].map(e => {
                        const isActive = e.value === selectedElement;
                        // Tailwind classes string dynamically mapping (make sure safe list is available or hardcode them, here I'll use common ones to avoid purge issues)
                        const activeClasses = isActive ? `border-${e.twC}-400 bg-gray-800 text-${e.twC}-300 shadow-md` : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-transparent';
                        return (
                            <button key={e.value} onClick={() => setSelectedElement(e.value)} className={`p-2 rounded-lg font-semibold transition-all duration-200 border-2 flex flex-col items-center tooltip-container cursor-help ${activeClasses}`}>
                                <div className={isActive ? `text-${e.twC}-300` : 'text-gray-500'}>
                                  {e.icon}
                                </div>
                                <span className="text-xs">{e.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6 pb-4 border-b border-gray-600">
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">基礎攻擊力</label>
                    <input type="number" value={inputs.baseAtk === '' || Number.isNaN(inputs.baseAtk) ? '' : inputs.baseAtk} onChange={(e) => handleInputChange('baseAtk', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-yellow-400" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">屬性攻擊力 <span className="text-[10px] text-gray-500 font-normal ml-1">(異常武器輸入0)</span></label>
                    <input type="number" value={inputs.elementAtk === '' || Number.isNaN(inputs.elementAtk) ? '' : inputs.elementAtk} onChange={(e) => handleInputChange('elementAtk', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-yellow-400" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">初始 HP</label>
                    <input type="number" value={inputs.hp === '' || Number.isNaN(inputs.hp) ? '' : inputs.hp} onChange={(e) => handleInputChange('hp', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-yellow-400" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">肉質 (HZ)</label>
                    <input type="number" value={inputs.hitzone === '' || Number.isNaN(inputs.hitzone) ? '' : inputs.hitzone} onChange={(e) => handleInputChange('hitzone', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-yellow-400" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">動作值 (AV)</label>
                    <input type="number" value={inputs.actionValue === '' || Number.isNaN(inputs.actionValue) ? '' : inputs.actionValue} onChange={(e) => handleInputChange('actionValue', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-yellow-400" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">會心率 (%) <span className="text-[10px] text-gray-500 font-normal ml-1">(會影響攻擊增強【會心】)</span></label>
                    <input type="number" value={inputs.critRate === '' || Number.isNaN(inputs.critRate) ? '' : inputs.critRate} onChange={(e) => handleInputChange('critRate', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-yellow-400" />
                </div>
            </div>
        </div>
        
        {/* Skills Selection */}
        <div className="mb-10" id="skills-container">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center scroll-mt-24" id="skills-selection-header">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-yellow-500" /> <span>技能與增益</span>
                    </h2>
                    <button onClick={() => { setSelectedSkills({}); setSkillSearch(''); }} className="bg-red-600/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg flex items-center justify-center text-sm font-bold shadow-md transition-colors tooltip-container">
                        <Trash2 className="w-4 h-4 mr-1.5" />刪除
                    </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 bg-gray-700/30 p-3 rounded-lg">
                    <div className="flex-grow relative min-w-[150px]">
                        <input type="text" value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="搜尋技能..." className="bg-gray-700 text-white text-sm rounded px-3 py-2 pl-8 border border-gray-600 focus:border-yellow-500 w-full outline-none" />
                        <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                    </div>
                </div>
            </div>

            {/* Collapsible skills content (shown if searching) */}
            {skillSearch && (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar bg-gray-800/80 p-4 rounded-lg border border-gray-600 shadow-xl">
                    {SKILL_DATA.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase())).map(skill => (
                        <div key={skill.name} className="bg-gray-700/40 p-3 rounded border border-gray-600 hover:border-gray-500 transition-colors">
                            <div className="font-bold text-gray-200 text-sm mb-2">{skill.name}</div>
                            <div className="flex flex-wrap gap-1">
                                {skill.levels.map((_, i) => (
                                    <button 
                                      key={i} 
                                      onClick={() => {
                                        setSelectedSkills(prev => {
                                          const next = { ...prev };
                                          if (next[skill.name] === i + 1) delete next[skill.name];
                                          else next[skill.name] = i + 1;
                                          return next;
                                        });
                                      }}
                                      className={`p-1 w-8 text-xs font-semibold rounded-full transition-colors duration-200 cursor-pointer ${selectedSkills[skill.name] === i + 1 ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.6)]' : 'bg-gray-700 text-gray-300 hover:bg-red-500 hover:text-white'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-gray-700/50 p-4 rounded-lg mb-6 border border-gray-600 mt-4">
                <h3 className="text-sm font-bold text-yellow-500 mb-2">當前已選定技能 ({Object.keys(selectedSkills).length})</h3>
                {Object.keys(selectedSkills).length === 0 ? (
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400 p-4 bg-gray-800/50 rounded-lg border border-dashed border-gray-600 justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <ArrowLeftRight className="w-6 h-6 text-gray-500" />
                            <span>請在上方搜尋或使用圖片辨識功能...</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(selectedSkills).map(([skillName, levelOrUnknown]) => {
                            const level = levelOrUnknown as number;
                            const skillData = SKILL_DATA.find(s => s.name === skillName);
                            if (!skillData) return null;
                            const maxLvl = skillData.levels.length;
                            return (
                                <div key={skillName} className="relative bg-gray-800 border border-gray-600 rounded-lg p-3 flex items-center justify-between group hover:border-gray-500 transition-all shadow-sm">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${level >= maxLvl ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                    <div className="flex flex-col ml-2 flex-1">
                                        <span className="text-sm font-bold text-gray-200 leading-none">{skillName}</span>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            {Array.from({ length: maxLvl }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedSkills(prev => ({ ...prev, [skillName]: i + 1 }))}
                                                    className={`w-6 h-5 rounded hover:scale-110 transition-transform ${i < level ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-gray-700 hover:bg-gray-600'}`}
                                                ></button>
                                            ))}
                                            <span className="text-xs font-mono text-yellow-500 font-bold ml-1 w-8">Lv {level}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                            setSelectedSkills(prev => {
                                              const next = { ...prev };
                                              delete next[skillName];
                                              return next;
                                            });
                                        }} className="bg-gray-700 hover:bg-red-900/50 hover:text-red-400 text-gray-400 p-1.5 rounded transition-colors" title="重置">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col gap-1 w-full">
                    <input type="file" ref={fileInputRef} onChange={handleImageFile} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-lg flex items-center justify-center text-base w-full font-bold shadow-md transition-colors">
                        <ImageIcon className="w-5 h-5 mr-2" />
                        上傳圖片辨識
                    </button>
                </div>
                
                <div className="p-3 bg-red-900/40 border border-red-500/60 rounded-lg flex items-start gap-2 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-xs sm:text-sm text-red-200 font-medium leading-relaxed">
                        <span className="font-bold text-red-400">注意：AI有時會讀取錯誤，特別是帶有符號的技能，請確認技能和等級是否正確再繼續</span>
                    </p>
                </div>
            </div>
        </div>



        {/* Results */}
        <div id="calculation-result-area" className="bg-gray-900 p-6 rounded-xl shadow-inner border-2 border-gray-700 mb-10 min-h-[200px]">
            <div className="flex flex-row items-center justify-between border-b border-gray-700 pb-4 mb-6 gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-white flex items-center shrink-0">
                    <span className="text-red-500 mr-2 sm:mr-3">///</span> <span>計算結果</span>
                </h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleCalculate}
                        disabled={isCalculating}
                        className={`flex items-center justify-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-lg transition-all border shrink-0 ${
                            isCalculating 
                            ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white border-red-500 hover:scale-105'
                        }`}
                    >
                        <Calculator className={`w-3 h-3 sm:w-4 sm:h-4 ${isCalculating ? 'animate-pulse' : ''}`} />
                        <span>{isCalculating ? '計算中...' : '開始計算'}</span>
                    </button>
                    <button onClick={() => {
                        if (!results) return;
                        const newId = Date.now();
                        const newBuild = {
                          id: newId,
                          name: '',
                          weapon: selectedWeapon,
                          element: selectedElement,
                          results,
                          skills: selectedSkills,
                          inputs: { ...inputs, saPhial: saPhialType, saMode: saMode, cbPhial: cbPhialType, bowShot: selectedBowShotType, glType, glGrade, bgAmmo: bowgunAmmoType, igType, igAction }
                        };
                        saveBuilds([...savedBuilds, newBuild]);
                    }} className={`flex items-center justify-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-lg transition-all border shrink-0 ${results ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/50' : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'}`}>
                        <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>加入比較</span>
                    </button>
                </div>
            </div>
            
            {!results && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mb-3 text-gray-600" />
                    <p className="text-lg font-bold">尚未開始計算</p>
                    <p className="text-sm mt-1">請點上方「開始計算」按鈕獲取結果</p>
                </div>
            )}

            {results && (
              <>
                <p className="text-red-400 text-xs font-semibold text-right mb-4">
                    計算結果有小數點進位問題, 傷害有可能出現誤差
                </p>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 scroll-mt-24">
                  <div className="flex flex-col gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-gray-500 shadow-sm relative group">
                          <div className="flex items-center justify-between">
                              <span className="text-gray-400 font-bold text-base sm:text-lg">非爆擊</span>
                              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">{calculateFormatDamage(results.FinalNonCritDamage)}</span>
                          </div>
                      </div>
                      
                      <div className="bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500 shadow-sm relative group">
                          <div className="flex items-center justify-between">
                              <span className="text-red-400 font-bold text-lg sm:text-xl">爆擊</span>
                              <span className="text-5xl sm:text-6xl font-black text-yellow-400 tracking-tight drop-shadow-sm">{calculateFormatDamage(results.FinalCritDamage)}</span>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                          <div className="bg-indigo-900/20 p-2 rounded-lg text-right border border-indigo-900/30">
                              <div className="text-indigo-400 text-xs font-bold">負會心</div>
                              <div className="flex items-baseline justify-end gap-2">
                                  <div className="text-xl font-bold text-indigo-200">{calculateFormatDamage(results.FinalPurpleDamage)}</div>
                              </div>
                          </div>
                          <div className="bg-orange-900/20 p-2 rounded-lg text-right border border-orange-900/30">
                              <div className="text-orange-400 text-xs font-bold">凶會心</div>
                              <div className="flex items-baseline justify-end gap-2">
                                  <div className="text-xl font-bold text-orange-200">{calculateFormatDamage(results.FinalFuriousDamage)}</div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.isWyvernAmmo && results.WyvernDamage && (
                          <div className="col-span-1 md:col-span-2 bg-purple-900/10 rounded-lg p-3 border border-purple-800/30">
                              <h4 className="text-sm font-bold text-purple-400 mb-2 border-b border-purple-800/50 pb-1">重弩：龍擊彈</h4>
                              <div className="grid grid-cols-2 gap-4 text-center">
                                  <div>
                                      <span className="text-xs text-purple-300 block mb-1">第一下 (136)</span>
                                      <div className="text-2xl font-black text-white">{calculateFormatDamage(results.WyvernDamage.Hit1)}</div>
                                      <span className="text-[10px] text-gray-500 block mt-1">吃完美巧擊</span>
                                  </div>
                                  <div>
                                      <span className="text-xs text-purple-300 block mb-1">第二下 (68)</span>
                                      <div className="text-2xl font-black text-white">{calculateFormatDamage(results.WyvernDamage.Hit2)}</div>
                                      <span className="text-[10px] text-gray-500 block mt-1">不吃完美巧擊</span>
                                  </div>
                              </div>
                          </div>
                      )}

                      {results.isSA && results.PhialDamage && (
                          <div className="col-span-1 bg-orange-900/10 rounded-lg p-3 border border-orange-800/30">
                              <h4 className="text-sm font-bold text-orange-400 mb-2 border-b border-orange-800/50 pb-1">斬擊斧瓶傷</h4>
                              <div className="flex justify-between items-center px-2">
                                  <div className="text-center">
                                      <span className="text-xs text-gray-400 block mb-1">正常</span>
                                      <div className="text-xl font-bold text-white">{calculateFormatDamage(results.PhialDamage.Normal)}</div>
                                  </div>
                                  <div className="text-center">
                                      <span className="text-xs text-red-300 block mb-1">爆擊</span>
                                      <div className="text-xl font-bold text-yellow-400">{calculateFormatDamage(results.PhialDamage.Crit)}</div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {results.isCB && results.CBPhialDamage && (
                          <div className="col-span-1 md:col-span-2 bg-yellow-900/10 rounded-lg p-3 border border-yellow-800/30">
                              <h4 className="text-sm font-bold text-yellow-400 mb-2 border-b border-yellow-800/50 pb-1">充能斧瓶傷</h4>
                              <div className="grid grid-cols-3 gap-2 px-2">
                                  <div className="text-center bg-gray-800/30 rounded p-1">
                                      <span className="text-xs text-yellow-200 block mb-1">高解</span>
                                      <span className="text-xl font-black text-white">{calculateFormatDamage(results.CBPhialDamage.AED)}</span>
                                  </div>
                                  <div className="text-center bg-gray-800/30 rounded p-1">
                                      <span className="text-xs text-red-200 block mb-1">超解</span>
                                      <span className="text-xl font-black text-white">{calculateFormatDamage(results.CBPhialDamage.SAED)}</span>
                                  </div>
                                  <div className="text-center bg-red-900/20 border border-red-800/30 rounded p-1">
                                      <span className="text-xs text-red-400 block mb-1">SP 超解 {results.isSpActive ? "(+10% SP)" : ""}</span>
                                      <span className="text-xl font-black text-white">{calculateFormatDamage(results.CBPhialDamage.SPSAED)}</span>
                                      {!results.isSpActive && <span className="text-[10px] text-gray-500 block mt-1">請打開SP獵人狀態</span>}
                                  </div>
                              </div>
                          </div>
                      )}

                      {results.isBow && results.hasPowerShot && results.BowPowerShot && (
                          <div className="col-span-1 md:col-span-2 bg-teal-900/10 rounded-lg p-3 border border-teal-800/30">
                              <h4 className="text-sm font-bold text-teal-400 mb-2 border-b border-teal-800/50 pb-1">弓箭剛射</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                  <div>
                                      <span className="text-xs text-teal-200 block mb-1">正常</span>
                                      <span className="text-xl font-black text-white">{calculateFormatDamage(results.BowPowerShot.Normal)}</span>
                                  </div>
                                  <div>
                                      <span className="text-xs text-red-300 block mb-1">爆擊</span>
                                      <span className="text-xl font-black text-yellow-400">{calculateFormatDamage(results.BowPowerShot.Crit)}</span>
                                  </div>
                                  <div>
                                      <span className="text-xs text-indigo-400 block mb-1">負會心</span>
                                      <span className="text-lg font-bold text-indigo-200">{calculateFormatDamage(results.BowPowerShot.Neg)}</span>
                                  </div>
                                  <div>
                                      <span className="text-xs text-orange-400 block mb-1">凶會心</span>
                                      <span className="text-lg font-bold text-orange-200">{calculateFormatDamage(results.BowPowerShot.Furious)}</span>
                                  </div>
                              </div>
                          </div>
                      )}

                      {results.isGL && results.hasShelling && results.GLShelling && (
                          <div className="col-span-1 md:col-span-2 bg-amber-900/10 rounded-lg p-3 border border-amber-800/30">
                              <h4 className="text-sm font-bold text-amber-400 mb-2 border-b border-amber-800/50 pb-1">銃槍砲擊 (單下傷害)</h4>
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                                  <div className="bg-gray-800/50 rounded p-1">
                                      <span className="text-[10px] text-amber-200 block">砲擊</span>
                                      <span className="text-lg font-bold text-white">{calculateFormatDamage(results.GLShelling.Normal)}</span>
                                  </div>
                                  <div className="bg-gray-800/50 rounded p-1">
                                      <span className="text-[10px] text-amber-200 block">蓄力</span>
                                      <span className="text-lg font-bold text-white">{calculateFormatDamage(results.GLShelling.Charged)}</span>
                                  </div>
                                  <div className="bg-gray-800/50 rounded p-1">
                                      <span className="text-[10px] text-amber-200 block">全彈</span>
                                      <span className="text-lg font-bold text-white">{calculateFormatDamage(results.GLShelling.FullBurst)}</span>
                                  </div>
                                  <div className="bg-gray-800/50 rounded p-1">
                                      <span className="text-[10px] text-amber-200 block">龍杭</span>
                                      <span className="text-lg font-bold text-white">{calculateFormatDamage(results.GLShelling.Stake)}</span>
                                  </div>
                                  <div className="bg-red-900/20 rounded p-1 col-span-3 sm:col-span-1 border border-red-800/30">
                                      <span className="text-[10px] text-red-300 block">SP {results.isSpActive ? "(+10% SP)" : ""}</span>
                                      <span className="text-lg font-black text-white">{calculateFormatDamage(results.GLShelling.SP)}</span>
                                  </div>
                                  <div className="col-span-full grid grid-cols-2 gap-2">
                                      <div className="bg-cyan-900/20 rounded p-1 border border-cyan-700/50">
                                          <span className="text-[10px] text-cyan-400 block">空中全彈砲</span>
                                          <span className="text-lg font-black text-white">{calculateFormatDamage(results.GLShelling.AerialFullBurst)}</span>
                                      </div>
                                      <div className="bg-purple-900/30 rounded p-1 border border-purple-800/50">
                                          <span className="text-[10px] text-purple-300 block">爆杭砲</span>
                                          <span className="text-lg font-black text-white">{calculateFormatDamage(results.GLShelling.Wyrmstake)}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
              </>
            )}
            
            {results && (() => {
                let hitText = '';
                let titleText = '攻擊次數 (Hits)';
                if (results.isBow && results.selectedBowShotType !== 'other') {
                    const hits = BOW_HITS[results.selectedBowShotType];
                    const name = BOW_TYPE_NAMES[results.selectedBowShotType];
                    if (hits) {
                        hitText = `箭矢 ${hits.normal}下, 剛射 ${hits.power}下`;
                        if (name) titleText = `${name} ${titleText}`;
                    }
                } else if (results.isLBG || results.isHBG) {
                    const ammoType = results.bowgunAmmoType;
                    const name = BG_AMMO_NAMES[ammoType];
                    if (name) titleText = `${name} ${titleText}`;
                    if (ammoType === 'pierce') hitText = '彈藥固定動作值6下+非固定動作值5下';
                    else if (ammoType === 'slicing') hitText = '彈藥固定動作值4下+20動作值1下';
                    else if (BOWGUN_HITS[ammoType]) hitText = `彈藥 ${BOWGUN_HITS[ammoType]}下`;
                }
                
                if (hitText) {
                    return (
                        <div id="hit-count-display" className="mt-4 p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
                            <h4 id="hit-count-title" className="text-xs font-bold text-cyan-400 mb-1">{titleText}</h4>
                            <div id="hit-count-content" className="text-white font-mono text-sm">{hitText}</div>
                        </div>
                    );
                }
                return null;
            })()}
            
        </div>
        
        <div className="flex flex-col items-center justify-center mt-6 mb-4">
            <div className="relative group cursor-pointer w-[90%] sm:w-auto sm:max-w-max">
                <a href="https://www.youtube.com/@Gametimehk" target="_blank" rel="noopener noreferrer" className="block text-center bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-700 shadow-xl transition-all duration-300 relative overflow-hidden group-hover:border-yellow-500/50 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <p className="text-gray-300 font-medium text-[15px] sm:text-base leading-relaxed mb-2 px-2 sm:whitespace-nowrap">
                        如果想支持 <span className="text-yellow-400 font-bold whitespace-nowrap">GAMETIME尋樂</span> 繼續創作和更新，<br className="block sm:hidden" />
                        歡迎按一下贊助到YouTube的影片，<span className="whitespace-nowrap"><Coffee className="w-4 h-4 inline-block text-orange-400 shrink-0 mb-1" /> 請小弟飲杯檸檬茶</span>
                    </p>
                    <div className="flex items-center justify-center gap-2 sm:gap-3 text-yellow-400 font-bold bg-yellow-500/10 py-2.5 px-4 rounded-xl border border-yellow-500/20 mt-3 sm:my-3 w-full sm:w-max mx-auto">
                        <Youtube className="w-5 h-5 text-red-500 shrink-0" />
                        <span>用超級感謝 (Super Thanks)</span>
                    </div>
                </a>
            </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
            <h4 className="text-yellow-400 font-bold text-sm mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /><span>注意事項：</span></h4>
            <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
                <li>完美蓄力解放, 水面打擊大錘22轉的全疊打是不受加成的</li>
                <li>部分招式永遠是吃不到完美巧擊加成, 因為有前置攻擊, 如高解/超解瓶傷</li>
                <li>部分武器雖然有蓄力動作, 但遊戲就是不吃蓄力大師和完美蓄力解放效果</li>
                <li className="text-yellow-200">雖然計算結果會因為使用者有配帶某些技能有所改動，但玩家要有意識去判定該下動作能否觸發技能效果，例如高解不吃變形攻擊強化, 但系統不會知道這個動作值是什麼招式, 如果不會觸發的話，就把技能刪除</li>
                <li>本傷害計算器的結果只供參考, 使用者在制作防具或洗漂流石之前, 建議再自行計算一次以確保傷害正確</li>
                <li className="text-red-400 font-bold">火事+高能強化+體力類, 這個組合無法正確計算結果</li>
            </ul>
        </div>

        <a href="https://youtube.com/playlist?list=PLHcR9ys2uf7R8YK1W3ZAPUCm4TM3KYg2O&si=97IfsJhEWhEaR2pZ" target="_blank" className="mt-6 w-full flex items-center justify-center bg-[#FF0000] hover:bg-red-700 text-white text-lg font-bold py-4 rounded-xl shadow-lg transition-all duration-200 group border border-red-600 block text-center">
            <span>更多遊戲攻略</span>
            <ExternalLink className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </a>
        
        {/* Hunter and Monster Status */}
        <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 id="status-header" className="text-xl font-bold text-gray-300 mb-5 flex items-center scroll-mt-24">
                <Activity className="w-6 h-6 mr-3 text-yellow-500" /><span>獵人與魔物狀態</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.sp} onChange={e => handleInputChange('sp', e.target.checked)} className="h-4 w-4" /> SP</div>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.sleep} onChange={e => handleInputChange('sleep', e.target.checked)} className="h-4 w-4" /> 睡眠</div>
                    <span className="text-[10px] text-gray-500 pl-6">打開發動覺醒一擊</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.para} onChange={e => handleInputChange('para', e.target.checked)} className="h-4 w-4" /> 麻痺</div>
                    <span className="text-[10px] text-gray-500 pl-6">打開發動追擊麻</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.poison} onChange={e => handleInputChange('poison', e.target.checked)} className="h-4 w-4" /> 中毒</div>
                    <span className="text-[10px] text-gray-500 pl-6">打開發動追擊毒</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.aerial} onChange={e => handleInputChange('aerial', e.target.checked)} className="h-4 w-4" /> 輕巧(空戰)</div>
                    <span className="text-[10px] text-gray-500 pl-6">打開發動輕巧</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.abnormal} onChange={e => handleInputChange('abnormal', e.target.checked)} className="h-4 w-4" /> 獵人異常狀態</div>
                    <span className="text-[10px] text-gray-500 pl-6">打開發動劫血, 死裡逃生</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.eleWeak} onChange={e => handleInputChange('eleWeak', e.target.checked)} className="h-4 w-4" /> 150%弱屬加成</div>
                
                {selectedWeapon === '太刀' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.lsRed} onChange={e => { handleInputChange('lsRed', e.target.checked); if(e.target.checked) handleInputChange('cbRed', false); }} className="h-4 w-4" /> 太刀紅刃</div>}
                {selectedWeapon === '充能斧' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.cbRed} onChange={e => { handleInputChange('cbRed', e.target.checked);  if(e.target.checked) handleInputChange('lsRed', false); }} className="h-4 w-4" /> 充能斧紅盾</div>}
                {selectedWeapon === '斬擊斧' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.saRed} onChange={e => handleInputChange('saRed', e.target.checked)} className="h-4 w-4" /> 斬擊斧紅刃</div>}
                {selectedWeapon === '銃槍' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.glGroundSplitter} onChange={e => handleInputChange('glGroundSplitter', e.target.checked)} className="h-4 w-4" /> 地裂斬</div>}
                {selectedWeapon === '弓箭' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.bowC3} onChange={e => handleInputChange('bowC3', e.target.checked)} className="h-4 w-4" /> 弓箭蓄3</div>}
                {selectedWeapon === '銃槍' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.glBlue} onChange={e => handleInputChange('glBlue', e.target.checked)} className="h-4 w-4" /> 爆杭炮藍光</div>}
                {selectedWeapon === '銃槍' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.glGuard} onChange={e => handleInputChange('glGuard', e.target.checked)} className="h-4 w-4" /> 爆杭炮防禦</div>}
                
                {selectedWeapon === '重弩' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.hbgGlow} onChange={e => { handleInputChange('hbgGlow', e.target.checked); if(e.target.checked) handleInputChange('hbgRed', false); }} className="h-4 w-4" /> 發光子彈</div>}
                {selectedWeapon === '重弩' && <div className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={inputs.hbgRed} onChange={e => { handleInputChange('hbgRed', e.target.checked); if(e.target.checked) handleInputChange('hbgGlow', false); }} className="h-4 w-4" /> 紅光子彈</div>}
                
                {selectedWeapon === '操蟲棍' && <div className="flex items-center gap-2 text-sm text-emerald-400 font-bold"><input type="checkbox" checked={inputs.igFullAssist} onChange={e => handleInputChange('igFullAssist', e.target.checked)} className="h-4 w-4 accent-emerald-500" /> 全力共鬥</div>}
                {selectedWeapon === '操蟲棍' && <div className="flex items-center gap-2 text-sm text-emerald-400 font-bold"><input type="checkbox" checked={inputs.igEleUp} onChange={e => handleInputChange('igEleUp', e.target.checked)} className="h-4 w-4 accent-emerald-500" /> 屬性UP</div>}
            </div>

            <div className="flex flex-col gap-4 mt-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 flex flex-col justify-between h-full">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm items-center"><span className="text-gray-400 font-medium">物理總和 (結果摘要)</span><span className="font-mono font-bold text-xl text-gray-200">{results ? results.PhysicalPart.toFixed(2) : '0.00'}</span></div>
                        <div className="flex justify-between text-sm items-center"><span className="text-gray-400 font-medium">屬性總和</span><span className="font-mono font-bold text-xl text-gray-200">{results ? results.ElementalPart.toFixed(2) : '0.00'}</span></div>
                    </div>
                    <div className="border-t border-gray-600 my-3"></div>
                    <div className="flex justify-between items-center"><span className="text-yellow-500 font-bold text-sm">武器倍率</span><span className="font-mono font-black text-yellow-400 text-2xl">{results ? results.WeaponMultiplierDisplay : '0.00'}</span></div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">外部乘數</h3>
                    <div className="text-2xl font-mono font-bold text-green-400">{results ? results.TotalExternalMultiplier.toFixed(3) : '1.000'}x</div>
                </div>
            </div>

            <div className="mt-8">
                <SavedBuilds 
                   savedBuilds={savedBuilds} 
                   activeBaselineId={activeBaselineId}
                   setAsBase={setAsBase}
                   loadBuild={loadBuild}
                   deleteBuild={deleteBuild}
                   updateBuildName={updateBuildName}
                   clearAllBuilds={clearAllBuilds}
                   calculateFormatDamage={calculateFormatDamage}
                />
            </div>


        </div>
        
      </div>
      
      {/* Bottom Nav */}
      <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-700 flex justify-center py-1 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex justify-around w-full max-w-lg">
              <a href="#weapon-selection-header" className="nav-link flex flex-col items-center text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg">
                  <Swords className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">武器</span>
              </a>
              <a href="#parameters-area" className="nav-link flex flex-col items-center text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg">
                  <SlidersHorizontal className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">設定</span>
              </a>
              <a href="#skills-selection-header" className="nav-link flex flex-col items-center text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg">
                  <Zap className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">技能</span>
              </a>
              <a href="#status-header" className="nav-link flex flex-col items-center text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg">
                  <Activity className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">狀態</span>
              </a>
              <a href="#calculation-result-area" className="nav-link flex flex-col items-center text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg">
                  <Calculator className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">結果</span>
              </a>
              <a href="#baseline-section" className="nav-link flex flex-col items-center text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg">
                  <ArrowLeftRight className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">比較</span>
              </a>
          </div>
      </nav>
      {ocrFile && (
        <OcrModal 
          file={ocrFile} 
          onClose={() => setOcrFile(null)} 
          selectedSkills={selectedSkills}
          skillData={SKILL_DATA}
          onSuccess={(newSkills, count) => {
            setSelectedSkills(newSkills);
            setOcrFile(null);
            alert(`成功辨識 ${count} 個技能！`);
          }} 
        />
      )}
    </div>
  );
}
