import React, { useState } from 'react';
import { Star, Upload, Trash2, AlertCircle } from 'lucide-react';

interface SavedBuildsProps {
  savedBuilds: any[];
  activeBaselineId: number | null;
  setAsBase: (id: number) => void;
  loadBuild: (id: number) => void;
  deleteBuild: (id: number) => void;
  updateBuildName: (id: number, name: string) => void;
  clearAllBuilds: () => void;
  calculateFormatDamage: (num: number) => string;
}

const elementColorMap: Record<string, string> = { 'None': 'gray', 'Fire': 'red', 'Water': 'blue', 'Thunder': 'yellow', 'Ice': 'cyan', 'Dragon': 'purple' };
const elementNames: Record<string, string> = { 'None': '無屬性', 'Fire': '火', 'Water': '水', 'Thunder': '雷', 'Ice': '冰', 'Dragon': '龍' };

export default function SavedBuilds({ savedBuilds, activeBaselineId, setAsBase, loadBuild, deleteBuild, updateBuildName, clearAllBuilds, calculateFormatDamage }: SavedBuildsProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  let baseRes: any = null;
  if (activeBaselineId) {
      const baseBuild = savedBuilds.find(b => b.id === activeBaselineId);
      if (baseBuild) baseRes = baseBuild.results;
  }

  const renderRow = (label: string, curr?: number | null, base?: number | null, color='text-white') => {
      if (curr === undefined || base === undefined || curr === null || base === null) return null; 
      const diff = curr - base;
      let diffNode = <span className="text-gray-600 font-mono text-[10px] font-bold">(-)</span>;
      if (!isNaN(diff)) {
          const sign = diff > 0 ? '+' : '';
          const diffColor = diff > 0 ? 'text-green-400' : (diff < 0 ? 'text-red-400' : 'text-gray-500');
          diffNode = <span className={`${diffColor} font-mono text-[10px] font-bold`}>({sign}{calculateFormatDamage(diff)})</span>;
      }
      return (
          <div className="flex justify-between items-center text-xs py-1 border-b border-gray-700/50 last:border-0">
              <span className="text-gray-400">{label}</span>
              <div className="flex items-center gap-2">
                  <span className={`${color} font-mono`}>{calculateFormatDamage(curr)}</span>
                  {diffNode}
              </div>
          </div>
      );
  };

  return (
    <div id="baseline-section" className="bg-gray-700/50 p-4 rounded-lg mb-6 border border-gray-600 mt-8 scroll-mt-24">
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-yellow-500 flex items-center">
              <span>已儲存的配裝比較</span>
          </h3>
          {confirmClear ? (
              <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400 font-bold">確定要清空嗎？</span>
                  <button onClick={() => { clearAllBuilds(); setConfirmClear(false); }} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg">
                      確定
                  </button>
                  <button onClick={() => setConfirmClear(false)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                      取消
                  </button>
              </div>
          ) : (
              <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 bg-red-900/50 hover:bg-red-700 text-red-200 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-800/50 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空列表</span>
              </button>
          )}
      </div>
      
      {savedBuilds.length === 0 ? (
          <div className="text-gray-400 text-xs text-center py-8">尚未加入任何配裝</div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {savedBuilds.map((build, index) => {
                  const isBase = build.id === activeBaselineId;
                  const wName = build.weapon;
                  const eName = elementNames[build.element] || build.element;
                  const eleColor = elementColorMap[build.element] || 'gray';
                  const eleBadgeClass = `text-[10px] px-2 py-0.5 rounded bg-${eleColor}-900/50 text-${eleColor}-400 border border-${eleColor}-500/30`;

                  let subTypeHtml: any = null;
                  if (build.weapon === '銃槍') {
                       const names: Record<string, string> = { 'normal': '通常型', 'long': '放射型', 'wide': '擴散型', 'other': '其他招式' };
                       subTypeHtml = <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-500/30 ml-2">{names[build.inputs.glType] || build.inputs.glType}</span>;
                  } else if (build.weapon === '充能斧') {
                       const names: Record<string, string> = { 'impact': '榴彈瓶', 'element': '強屬性瓶' };
                       subTypeHtml = <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-300 border border-yellow-500/30 ml-2">{names[build.inputs.cbPhial] || build.inputs.cbPhial}</span>;
                  } else if (build.weapon === '斬擊斧') {
                       const names: Record<string, string> = { 'power': '強擊瓶', 'element': '強屬性瓶', 'other': '其他瓶' };
                       subTypeHtml = <span className="text-[10px] px-2 py-0.5 rounded bg-orange-900/50 text-orange-300 border border-orange-500/30 ml-2">{names[build.inputs.saPhial] || build.inputs.saPhial}</span>;
                  } else if (build.weapon === '操蟲棍') {
                       const types: Record<string, string> = { 'dust': '粉塵', 'aerial': '飛翔', 'assist': '共鬥' };
                       const actions: Record<string, string> = { 'normal_dust': '普通粉', 'strong_dust': '強粉塵', 'chain_dust': '連爆粉', 'other': '其他' };
                       let tStr = types[build.inputs.igType] || build.inputs.igType;
                       let aStr = actions[build.inputs.igAction];
                       let displayStr = aStr ? `${tStr} - ${aStr}` : tStr;
                       subTypeHtml = <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 ml-2">{displayStr}</span>;
                  }

                  const borderClasses = isBase 
                      ? "border-2 border-yellow-400 bg-gray-800/80 shadow-[0_0_15px_rgba(250,204,21,0.2)]" 
                      : "border border-white/40 bg-gray-800/60 hover:bg-gray-800/80 hover:border-white/60";

                  return (
                      <div key={build.id} className={`relative rounded-xl p-4 transition-all flex flex-col saved-build-card ${borderClasses}`}>
                          <div className="absolute -left-2 -top-2 bg-gray-900 border border-gray-600 text-gray-400 text-[10px] font-mono px-1.5 py-0.5 rounded shadow z-10">#{index + 1}</div>
                          <div className="flex items-start justify-between mb-1">
                              <div className="flex flex-col gap-1 w-full pr-2">
                                   <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-yellow-400 font-black text-lg shadow-black drop-shadow-md">{wName}</span>
                                      <span className={`${eleBadgeClass} font-bold shadow-sm`}>{eName}</span>
                                      {subTypeHtml}
                                  </div>
                                  <input type="text" 
                                      className="bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:text-white outline-none w-full font-medium" 
                                      placeholder="輸入名稱..." 
                                      value={build.name || ''} 
                                      onChange={(e) => updateBuildName(build.id, e.target.value)}
                                  />
                              </div>
                              <div className="flex gap-1 shrink-0">
                                  <button onClick={() => setAsBase(build.id)} className={`p-1.5 rounded-full hover:bg-white/10 text-gray-400 transition-colors ${isBase ? "text-yellow-400 fill-yellow-400" : "hover:text-yellow-400"}`} title="設為基準">
                                      <Star className={`w-5 h-5 ${isBase ? 'fill-current' : ''}`} />
                                  </button>
                                  <button onClick={() => loadBuild(build.id)} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 transition-colors hover:text-blue-400" title="讀取">
                                      <Upload className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => deleteBuild(build.id)} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 transition-colors hover:text-red-400" title="刪除">
                                      <Trash2 className="w-5 h-5" />
                                  </button>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2 mt-2 bg-gray-900/30 p-2 rounded">
                              <div>
                                  <div className="text-[10px] text-gray-400">非爆擊</div>
                                  <div className="text-xl font-bold text-white font-mono tracking-tight">{calculateFormatDamage(build.results.FinalNonCritDamage)}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-red-400">爆擊</div>
                                  <div className="text-xl font-bold text-yellow-400 font-mono tracking-tight">{calculateFormatDamage(build.results.FinalCritDamage)}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-indigo-300">負會心</div>
                                  <div className="text-lg font-bold text-indigo-100 font-mono tracking-tight">{calculateFormatDamage(build.results.FinalPurpleDamage)}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] text-orange-300">凶會心</div>
                                  <div className="text-lg font-bold text-orange-100 font-mono tracking-tight">{calculateFormatDamage(build.results.FinalFuriousDamage)}</div>
                              </div>
                          </div>

                          {Object.keys(build.skills).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                  {Object.keys(build.skills).map(k => (
                                      <span key={k} className="text-xs text-gray-300 bg-gray-700/50 px-1.5 py-0.5 rounded border border-gray-600/50">
                                          {k} <span className="text-yellow-500">{build.skills[k]}</span>
                                      </span>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-xs text-gray-500 italic mt-2">無技能</div>
                          )}

                          {baseRes && !isBase && (
                              <div className="mt-3 pt-2 border-t border-white/10">
                                  <div className="text-[10px] uppercase text-cyan-400 font-bold mb-1 tracking-wider">對比 (VS 基準)</div>
                                  <div className="flex flex-col gap-0.5">
                                      {renderRow('非爆擊', build.results.FinalNonCritDamage, baseRes.FinalNonCritDamage)}
                                      {renderRow('爆擊', build.results.FinalCritDamage, baseRes.FinalCritDamage, 'text-yellow-400')}
                                      {renderRow('負會心', build.results.FinalPurpleDamage, baseRes.FinalPurpleDamage, 'text-indigo-300')}
                                      {renderRow('凶會心', build.results.FinalFuriousDamage, baseRes.FinalFuriousDamage, 'text-orange-300')}
                                      
                                      {build.weapon === savedBuilds.find(b => b.id === activeBaselineId)?.weapon && (
                                          <>
                                              {build.weapon === '銃槍' && build.results.isGL && baseRes.isGL && (
                                                  <div className="mt-1 flex flex-col gap-0.5 border-t border-gray-600/50 pt-1">
                                                      {renderRow('通常砲擊', build.results.GLShelling.Normal, baseRes.GLShelling.Normal, 'text-amber-200')}
                                                      {renderRow('蓄力砲擊', build.results.GLShelling.Charged, baseRes.GLShelling.Charged, 'text-amber-200')}
                                                      {renderRow('龍杭砲', build.results.GLShelling.Stake, baseRes.GLShelling.Stake, 'text-amber-200')}
                                                      {renderRow('全彈發射', build.results.GLShelling.FullBurst, baseRes.GLShelling.FullBurst, 'text-amber-200')}
                                                      {renderRow('空中全彈發射', build.results.GLShelling.AerialFullBurst, baseRes.GLShelling.AerialFullBurst, 'text-amber-200')}
                                                      {renderRow('龍擊砲', build.results.GLShelling.Wyrmstake || 0, baseRes.GLShelling.Wyrmstake || 0, 'text-amber-200')}
                                                      {renderRow('SP 龍擊砲', build.results.GLShelling.SP, baseRes.GLShelling.SP, 'text-amber-200')}
                                                  </div>
                                              )}
                                              {build.weapon === '重弩' && build.results.isWyvernAmmo && baseRes.isWyvernAmmo && (
                                                  <div className="mt-1 flex flex-col gap-0.5 border-t border-gray-600/50 pt-1">
                                                      {renderRow('龍擊彈 - 第一下', build.results.WyvernDamage.Hit1, baseRes.WyvernDamage.Hit1, 'text-orange-200')}
                                                      {renderRow('龍擊彈 - 第二下', build.results.WyvernDamage.Hit2, baseRes.WyvernDamage.Hit2, 'text-orange-200')}
                                                  </div>
                                              )}
                                          </>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
}
