// Layout-specific curated pattern IDs from the original UI's PRESET_MAP.
export const patternMap={dual:[1,3,5,7,9,11,21,23],triple:[1,2,3,4,5,6,7,8],quad:[1,2,3,4,9,10,11,12,13,14,15,16,17,18,19,20],octo:[1,5,6,7,21,22,23,25,26,27,30,31]};
export function patternIds(view){return patternMap[view]||[]}
export function tileFlips(preset,count){const h=[[0,0,0,0],[0,0,1,1],[1,0,0,1],[0,1,1,0],[1,1,1,1],[1,1,0,0],[0,1,0,1],[1,0,1,0]][Math.floor((preset-1)/4)],v=[[0,0],[0,1],[1,0],[1,1]][(preset-1)%4];return Array.from({length:count},(_,i)=>[h[i%4],v[i>>2]])}
