// ---------------------------------------------------------------- the painting's perspective
// a camera on the Trocadéro esplanade, 25 m up, looking level down the axis; painting units (viewBox 816 × 1398) map to the image plane
export var EX = 430, HZ = 965, F = 1115, ZC = 600, HC = 25.3, VBW = 816, VBH = 1398, VBY = 90;
export function gY0(x, z) { return z < ZC - dOf(1042) + 2 ? 0.02 : z < ZC - dOf(1123) ? -2.6 : 0.05; }
export function dOf(y) { return F * HC / (y - HZ); }                                          // depth of the ground line painted at y
export function gp(x, y, Y) { var d = dOf(y); return [(x - EX) * d / F, Y || 0, ZC - d]; }     // painted ground point → world
export function at(x, y, d) { return [(x - EX) * d / F, HC - (y - HZ) * d / F, ZC - d]; }      // painted point placed at depth d
export function uu(d) { return d / F; }                                                       // metres per painting unit at depth d
export var TW_U = ZC / F;                                                                     // at the tower
export function twv(y) { var t = (1012 - y) / 530; return 96 * Math.pow(Math.max(0, 1 - t), 2.35) + 3.4; }
export function towerW(h) { return twv(1012 - h / TW_U) * TW_U; }
