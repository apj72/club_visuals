// Layout-specific curated pattern IDs from the original UI's PRESET_MAP.
import {flipFor} from './preview.js';
export const patternMap={dual:[1,3,5,7,9,11,21,23],triple:[1,2,3,4,5,6,7,8],quad:[1,2,3,4,9,10,11,12,13,14,15,16,17,18,19,20],octo:[1,5,6,7,21,22,23,25,26,27,30,31]};
export const tilePositions={dual:[0,3],triple:[0,1,2],quad:[0,1,4,5],octo:[0,1,2,3,4,5,6,7]};
export function tileFlips(preset,view){return(tilePositions[view]||[]).map(position=>flipFor(preset,position))}
export function patternIds(view){const ids=patternMap[view]||[],seen=new Set();return ids.filter(id=>{const flips=tileFlips(id,view),[baseX,baseY]=flips[0]||[0,0],key=flips.map(([x,y])=>`${x^baseX}${y^baseY}`).join('');if(seen.has(key))return false;seen.add(key);return true})}

// Small hand-picked starting sets favour even, mirror-balanced compositions.
export const recommendedPatterns={dual:[1,5],triple:[1,5],quad:[1,9],octo:[6,7]};
export function recommendedIds(view){const all=patternIds(view),recommended=recommendedPatterns[view]||[];return recommended.filter(id=>all.includes(id))}
