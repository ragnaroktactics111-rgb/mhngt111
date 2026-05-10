import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, ScanText, Loader2 } from 'lucide-react';
// @ts-ignore
import Tesseract from 'tesseract.js';

function levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function slidingWindowFuzzySearch(text: string, pattern: string) {
    if (pattern.length === 0) return { index: -1, length: 0 };
    let maxDistance = 0;
    if (pattern.length >= 2) maxDistance = 1;
    if (pattern.length >= 3) maxDistance = 2;
    if (pattern.length >= 5) maxDistance = 3;
    if (pattern.length >= 7) maxDistance = 4;
    
    if (text.length < pattern.length - maxDistance) return { index: -1, length: 0 };
    
    let bestIndex = -1;
    let bestLength = 0;
    let minDistance = maxDistance + 1;
    
    for (let i = 0; i <= text.length - Math.max(1, pattern.length - maxDistance); i++) {
        for (let j = Math.max(1, pattern.length - maxDistance); j <= pattern.length + maxDistance; j++) {
            if (i + j > text.length) continue;
            let sub = text.substring(i, i + j);
            let d = levenshteinDistance(sub, pattern);
            if (d < minDistance) {
                minDistance = d;
                bestIndex = i;
                bestLength = j;
            }
        }
    }
    if (minDistance <= maxDistance) {
        return { index: bestIndex, length: bestLength };
    }
    return { index: -1, length: 0 };
}

interface OcrModalProps {
    file: File | null;
    onClose: () => void;
    onSuccess: (newSkills: Record<string, number>, count: number) => void;
    selectedSkills: Record<string, number>;
    skillData: any[];
}

export default function OcrModal({ file, onClose, onSuccess, selectedSkills, skillData }: OcrModalProps) {
    const [mode, setMode] = useState<'crop' | 'pan'>('crop');
    const [zoom, setZoom] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(new Image());
    
    const cropState = useRef({ scale: 1, baseScale: 1, panX: 0, panY: 0, mode: 'crop' });
    const cropper = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0, isDragging: false, hasCrop: false });
    const lastPanPos = useRef({ x: 0, y: 0 });

    const drawCropCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(cropState.current.panX, cropState.current.panY);
        ctx.scale(cropState.current.scale, cropState.current.scale);
        const img = imgRef.current;
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        const crp = cropper.current;
        if (crp.hasCrop || (crp.isDragging && cropState.current.mode === 'crop')) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const x = Math.min(crp.startX, crp.currentX);
            const y = Math.min(crp.startY, crp.currentY);
            const w = Math.abs(crp.startX - crp.currentX);
            const h = Math.abs(crp.startY - crp.currentY);
            
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillRect(x, y, w, h);
            ctx.restore();
            
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2; 
            ctx.strokeRect(x, y, w, h);
        }
    }, []);

    const initCanvasImage = useCallback(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;
        
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        
        const padding = 20;
        const availW = cw - padding * 2;
        const availH = ch - padding * 2;
        
        const img = imgRef.current;
        cropState.current.baseScale = Math.min(availW / img.width, availH / img.height);
        cropState.current.scale = cropState.current.baseScale * zoom;
        
        canvas.width = cw;
        canvas.height = ch;
        
        cropState.current.panX = cw / 2;
        cropState.current.panY = ch / 2;
        
        cropper.current.hasCrop = false;
        cropper.current.isDragging = false;
        
        drawCropCanvas();
    }, [drawCropCanvas, zoom]);

    useEffect(() => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imgRef.current.onload = () => {
                initCanvasImage();
            };
            imgRef.current.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }, [file, initCanvasImage]);

    useEffect(() => {
        cropState.current.mode = mode;
        if (mode === 'pan') {
            cropper.current.hasCrop = false;
            drawCropCanvas();
        }
    }, [mode, drawCropCanvas]);

    useEffect(() => {
        cropState.current.scale = cropState.current.baseScale * zoom;
        cropper.current.hasCrop = false;
        drawCropCanvas();
    }, [zoom, drawCropCanvas]);

    const getCanvasPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (cropState.current.mode === 'crop') {
            const pos = getCanvasPos(e, canvas);
            cropper.current.startX = pos.x;
            cropper.current.startY = pos.y;
            cropper.current.currentX = pos.x;
            cropper.current.currentY = pos.y;
            cropper.current.isDragging = true;
            cropper.current.hasCrop = false;
        } else {
            cropper.current.isDragging = true;
            let clientX, clientY;
            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as React.MouseEvent).clientX;
                clientY = (e as React.MouseEvent).clientY;
            }
            lastPanPos.current = { x: clientX, y: clientY };
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!cropper.current.isDragging) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (cropState.current.mode === 'crop') {
            const pos = getCanvasPos(e, canvas);
            cropper.current.currentX = pos.x;
            cropper.current.currentY = pos.y;
            drawCropCanvas();
        } else {
            let clientX, clientY;
            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as React.MouseEvent).clientX;
                clientY = (e as React.MouseEvent).clientY;
            }
            const dx = clientX - lastPanPos.current.x;
            const dy = clientY - lastPanPos.current.y;
            cropState.current.panX += dx;
            cropState.current.panY += dy;
            lastPanPos.current = { x: clientX, y: clientY };
            drawCropCanvas();
        }
    };

    const handleEnd = () => {
        if (!cropper.current.isDragging) return;
        cropper.current.isDragging = false;
        if (cropState.current.mode === 'crop') {
            const crp = cropper.current;
            if (Math.abs(crp.startX - crp.currentX) > 20 && Math.abs(crp.startY - crp.currentY) > 20) {
                crp.hasCrop = true;
            } else {
                crp.hasCrop = false;
            }
            drawCropCanvas();
        }
    };

    const handleConfirm = async () => {
        setIsProcessing(true);
        const crp = cropper.current;
        const img = imgRef.current;
        const cState = cropState.current;
        let dataUrl: string;

        if (crp.hasCrop) {
            const x = Math.min(crp.startX, crp.currentX);
            const y = Math.min(crp.startY, crp.currentY);
            const w = Math.abs(crp.startX - crp.currentX);
            const h = Math.abs(crp.startY - crp.currentY);
            
            const origX = (x - cState.panX) / cState.scale + img.width / 2;
            const origY = (y - cState.panY) / cState.scale + img.height / 2;
            const origW = w / cState.scale;
            const origH = h / cState.scale;

            const finalX = Math.max(0, origX);
            const finalY = Math.max(0, origY);
            const finalW = Math.min(img.width - finalX, origW);
            const finalH = Math.min(img.height - finalY, origH);

            if (finalW > 0 && finalH > 0) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = finalW * 2; 
                tempCanvas.height = finalH * 2;
                const tCtx = tempCanvas.getContext('2d');
                if (tCtx) {
                    tCtx.fillStyle = '#ffffff';
                    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                    tCtx.imageSmoothingEnabled = true;
                    tCtx.drawImage(img, finalX, finalY, finalW, finalH, 0, 0, finalW * 2, finalH * 2);
                }
                enhanceCanvasForOCR(tempCanvas);
                dataUrl = tempCanvas.toDataURL('image/png');
            } else {
                dataUrl = getFullImageDataUrl();
            }
        } else {
            dataUrl = getFullImageDataUrl();
        }

        function enhanceCanvasForOCR(canvas: HTMLCanvasElement) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                let v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                v = (v - 128) * 1.5 + 128;
                v = Math.min(255, Math.max(0, v));
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = v;
            }
            ctx.putImageData(imageData, 0, 0);
        }

        function getFullImageDataUrl() {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width * 2; 
            tempCanvas.height = img.height * 2;
            const tCtx = tempCanvas.getContext('2d');
            if (tCtx) {
                tCtx.fillStyle = '#ffffff';
                tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tCtx.imageSmoothingEnabled = true;
                tCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width * 2, img.height * 2);
            }
            enhanceCanvasForOCR(tempCanvas);
            return tempCanvas.toDataURL('image/png');
        }

        try {
            const worker = await Tesseract.createWorker('chi_tra');
            
            const uniqueChars = new Set<string>();
            const extraChars = "0123456789LVlv等級. 【】［］()（）〈〉<>-";
            for (let c of extraChars) uniqueChars.add(c);
            skillData.forEach(skill => {
                for (let c of skill.name) uniqueChars.add(c);
            });
            const whitelist = Array.from(uniqueChars).join('');
            
            await worker.setParameters({
                tessedit_char_whitelist: whitelist
            });

            const ret = await worker.recognize(dataUrl);
            await worker.terminate();
            console.log('--- OCR RAW TEXT ---');
            console.log(ret.data.text);
            console.log('--------------------');
            parseOCRText(ret.data.text);
        } catch (err) {
            console.error(err);
            alert('辨識失敗，請檢查網路連線或重試。');
            setIsProcessing(false);
        }
    };

    const parseOCRText = (text: string) => {
        let cleanText = text.replace(/[\s\r\n]+/g, '');
        cleanText = cleanText.replace(/([Ll][Vv])\s*[!|Il]/gi, '$11');
        cleanText = cleanText.replace(/([Ll][Vv])\s*[zZ]/gi, '$12');
        cleanText = cleanText.replace(/([Ll][Vv])\s*[sS]/gi, '$15');
        
        const OCR_ALIASES = [
            { reg: /[奇][襲袭][【\[\(〈<1lI]?[狀状][態态]?[異异]?[常][】\]\)〉>sS]?/gi, target: "IGNORED_SKILL" },
            { reg: /適[中正].?距[離离]威力UP/gi, target: "最有效距離威力UP" },
            { reg: /[屹乞吃]?[立力]不[倒到]/g, target: "屹立不倒" }, 
            { reg: /(蠻|蛮|變|燮|变|馨|譽|驚|蟹|灣|戀|鑾).?[力カ]/g, target: "蠻力" },
            { reg: /[覺觉党蟹].?[醒里星性酯配].?一?[-—_1I|]*[擊击撃擎肇]/g, target: "覺醒一擊" },
            { reg: /[死].?[裡里][逃][生]/g, target: "死裡逃生" },
            { reg: /[精].?[靈灵][加].?[護护]/g, target: "精靈加護" },
            { reg: /[弱].?[點点]特[效効]/g, target: "弱點特效" },
            { reg: /[力万][量重][解][放]/g, target: "力量解放" },
            { reg: /[轉转][禍祸][為为][福]/g, target: "轉禍為福" },
            { reg: /[蓄].[大][師师]/g, target: "蓄力大師" },
            { reg: /[無无燕][傷伤]/g, target: "無傷" },
            { reg: /[鬥斗][氣气]活[性星]/g, target: "鬥氣活性" },
            { reg: /[凶兇][會会][心]/g, target: "凶會心" },
            { reg: /[砲炮][術术]/g, target: "砲術" },
            { reg: /体力/g, target: "體力" }, 
            { reg: /弱点/g, target: "弱點" },
            { reg: /防[禦御][性星]能/g, target: "防禦性能" },
            { reg: /追[擊撃][^0-9]{0,4}毒[^0-9]{0,3}/g, target: "追擊【毒】" },
            { reg: /追[擊撃][^0-9]{0,4}麻[^0-9]{0,3}/g, target: "追擊【麻痺】" },
            { reg: /[^0-9]{0,2}[減滅灭]?[盡尽][龍龙]?[^0-9]{0,4}/g, target: "滅盡龍的渴望" },
            { reg: /[^0-9]{0,2}波[龍龙]?[^0-9]{0,5}/g, target: "溟波龍的雷浪" },
            { reg: /[^0-9]{0,2}霞[龍龙]?[^0-9]{0,4}/g, target: "霞龍的毒霧" },
            { reg: /連[擊撃][・.、\-]?境界/g, target: "連擊境界" },
            { reg: /完美巧[擊撃][【\[\(〈<1lI]?持[續续][】\]\)〉>sS]?/gi, target: "完美巧擊持續" },
            { reg: /完美巧[擊击撃]/g, target: "完美巧擊" },
            { reg: /高能[強强]化[【\[\(〈<1lI]?(火|冰|水|雷|龍)[】\]\)〉>sS]?/gi, target: "高能強化【$1】" },
            { reg: /會心[擊撃][【\[\(〈<1lI]?屬性[】\]\)〉>sS]?/gi, target: "會心擊【屬性】" },
            { reg: /[超起][會会][心]/g, target: "超會心" },
            { reg: /[連连][擊击撃]/g, target: "連擊" },
            { reg: /[巧][擊击撃]/g, target: "巧擊" },
            { reg: /SP威力提升/gi, target: "SP技能威力提升" },
            { reg: /攻擊[・.、\- ]*境界/g, target: "攻擊境界" },
            { reg: /通常[彈弹][^0-9]{0,15}/g, target: "通常彈．屬性通常彈強化" },
            { reg: /攻擊增[強强][^0-9LlVv等級]*/g, target: "攻擊增強【會心】" },
            { reg: /團[體体]狩獵[強强]化[【\[\(〈<1lI]?攻擊[】\]\)〉>sS]?/gi, target: "團體狩獵強化【攻擊】" },
            { reg: /(冰|雷)[屬属][^0-9界]{0,8}境界/g, target: "$1屬性攻擊強化境界" },
            { reg: /水[屬属][^0-9界]{0,8}境界/g, target: "水屬性攻擊強化境界" },
            { reg: /(火|龍)[屬属][^0-9界]{0,8}境界/g, target: "$1屬性攻擊強化境界" }, 
            { reg: /(火|水|雷|冰|龍)[屬属][^0-9化]{0,5}[強强]化/g, target: "$1屬性攻擊強化" }
        ];

        OCR_ALIASES.forEach(alias => {
            cleanText = cleanText.replace(alias.reg, alias.target);
        });

        cleanText = cleanText.replace(/[=/\-_|]{2,}/g, '');

        let foundCount = 0;
        const sortedSkills = [...skillData].sort((a, b) => b.name.length - a.name.length);
        const newSkills = { ...selectedSkills };

        const processMatch = (skill: any, matchIndex: number, matchLength: number) => {
            let level = 1; 
            const afterSkill = cleanText.substring(matchIndex + matchLength);
            let searchLimit = afterSkill.indexOf('@@@');
            if (searchLimit === -1 || searchLimit > 30) {
                searchLimit = 30;
            }
            
            const searchArea = afterSkill.substring(0, searchLimit);
            const explicitMatch = searchArea.match(/(?:[Ll][Vv]\.?|等級|L)\s*([1-5])/i);
            
            if (explicitMatch) {
                level = parseInt(explicitMatch[1]);
            } else {
                const digitMatch = searchArea.match(/([1-5])/);
                if (digitMatch) {
                    level = parseInt(digitMatch[1]);
                }
            }
            
            if (level > skill.levels.length) level = skill.levels.length;
            if (level < 1) level = 1;
            
            if (!newSkills[skill.name] || level > newSkills[skill.name]) {
                newSkills[skill.name] = level;
            }
            foundCount++;
            cleanText = cleanText.substring(0, matchIndex) + '@@@' + cleanText.substring(matchIndex + matchLength);
        };

        sortedSkills.forEach(skill => {
            const skillName = skill.name;
            let skillIndex = cleanText.indexOf(skillName);
            let loops = 0;
            while (skillIndex !== -1 && loops < 10) {
                processMatch(skill, skillIndex, skillName.length);
                skillIndex = cleanText.indexOf(skillName);
                loops++;
            }
        });

        sortedSkills.forEach(skill => {
            const skillName = skill.name;
            let match = slidingWindowFuzzySearch(cleanText, skillName);
            let fuzzyLoops = 0;
            while (match.index !== -1 && fuzzyLoops < 10) {
                processMatch(skill, match.index, match.length);
                match = slidingWindowFuzzySearch(cleanText, skillName);
                fuzzyLoops++;
            }
        });

        if (foundCount > 0) {
            onSuccess(newSkills, foundCount);
        } else {
            alert('未能從圖片中辨識到任何資料庫內已有的技能。\n請嘗試縮小「框選範圍」使其精確對準文字，或確保圖片清晰度。');
        }
    };

    if (!file) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl p-4 w-full max-w-lg flex flex-col items-center border border-gray-600 shadow-2xl">
                <h3 className="text-white font-bold mb-1 flex items-center"><Crop className="w-5 h-5 mr-2 text-blue-400" />請框選技能區域</h3>
                <p className="text-xs text-gray-400 mb-2 text-center">滑動框選技能名稱與等級。可切換移動模式或使用下方滑桿放大縮小。</p>
                
                <div className="flex items-center justify-between w-full mb-3 gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700">
                    <div className="flex gap-1">
                        <button onClick={() => setMode('crop')} className={`${mode === 'crop' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} px-3 py-1.5 rounded-md text-sm font-bold shadow transition-colors`}>✂️ 框選</button>
                        <button onClick={() => setMode('pan')} className={`${mode === 'pan' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} px-3 py-1.5 rounded-md text-sm font-bold shadow transition-colors`}>🖐 移動</button>
                    </div>
                    <div className="flex items-center gap-2 flex-1 ml-2">
                        <ZoomOut className="w-4 h-4 text-gray-400" />
                        <input type="range" min="0.5" max="5" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-blue-500" />
                        <ZoomIn className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
                
                <div 
                    ref={containerRef}
                    className="relative w-full overflow-hidden bg-gray-900 border-2 border-gray-700 rounded-lg flex justify-center touch-none select-none shadow-inner" 
                    style={{ height: "50vh" }}
                >
                    <canvas 
                        ref={canvasRef}
                        className="block"
                        onMouseDown={handleStart}
                        onTouchStart={handleStart}
                        onMouseMove={handleMove}
                        onTouchMove={handleMove}
                        onMouseUp={handleEnd}
                        onTouchEnd={handleEnd}
                        onMouseLeave={handleEnd}
                    />
                </div>
                
                <div className="flex gap-3 w-full mt-4">
                    <button onClick={onClose} disabled={isProcessing} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50">取消</button>
                    <button onClick={handleConfirm} disabled={isProcessing} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors shadow-lg shadow-blue-900/50 disabled:opacity-50">
                        {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ScanText className="w-5 h-5 mr-2" />}
                        {isProcessing ? '辨識中...' : '確認並辨識'}
                    </button>
                </div>
                
                {isProcessing && (
                    <div className="text-yellow-400 text-sm mt-3 flex items-center font-bold">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 正在處理與辨識文字中，請稍候...
                    </div>
                )}
            </div>
        </div>
    );
}
