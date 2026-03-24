// src/views/seasonData.js
// Plant registry and SVG icon definitions for the Current Season view.

export const PLANTS = [
  { key: 'tomato',        label: 'Tomato'        },
  { key: 'jalapeno',      label: 'Jalapeño'      },
  { key: 'bell-pepper',   label: 'Bell Pepper'   },
  { key: 'corn',          label: 'Corn'          },
  { key: 'oregano',       label: 'Oregano'       },
  { key: 'cilantro',      label: 'Cilantro'      },
  { key: 'blueberry',     label: 'Blueberry'     },
  { key: 'watermelon',    label: 'Watermelon'    },
  { key: 'cantaloupe',    label: 'Cantaloupe'    },
  { key: 'honeydew',      label: 'Honeydew'      },
  { key: 'summer-squash', label: 'Summer Squash' },
  { key: 'carrot',        label: 'Carrot'        },
  { key: 'radish',        label: 'Radish'        },
  { key: 'onion',         label: 'Onion'         },
  { key: 'chive',         label: 'Chive'         },
  { key: 'basil',         label: 'Basil'         },
];

/**
 * Returns the inner SVG markup for a 32×32 viewBox.
 * Safe to embed directly inside <svg viewBox="0 0 32 32">…</svg>.
 */
export function plantIconInner(key) {
  switch (key) {

    case 'tomato': return `
      <circle cx="16" cy="19" r="11" fill="#e53e3e"/>
      <path d="M11 10 C12 7 14 6 16 8 C18 6 20 7 21 10" fill="#276749"/>
      <line x1="16" y1="8" x2="16" y2="4" stroke="#276749" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="12" cy="16" rx="2" ry="3" fill="white" opacity="0.2"/>`;

    case 'jalapeno': return `
      <path d="M16 4 C20 4 23 8 23 16 C23 23 20 29 16 29 C12 29 9 23 9 16 C9 8 12 4 16 4Z" fill="#276749"/>
      <path d="M16 4 C17 3 18 3 18 5" fill="none" stroke="#48bb78" stroke-width="1.5" stroke-linecap="round"/>
      <ellipse cx="13" cy="14" rx="1.5" ry="5" fill="white" opacity="0.2"/>`;

    case 'bell-pepper': return `
      <path d="M16 7 C18.5 7 20 8.5 20 10 C22.5 10 25 12.5 25 17 C25 22.5 21 27 16 27 C11 27 7 22.5 7 17 C7 12.5 9.5 10 12 10 C12 8.5 13.5 7 16 7Z" fill="#e53e3e"/>
      <path d="M12 10 C11 14 11 20 12.5 24" fill="none" stroke="#c53030" stroke-width="1"/>
      <path d="M20 10 C21 14 21 20 19.5 24" fill="none" stroke="#c53030" stroke-width="1"/>
      <line x1="16" y1="7" x2="16" y2="4" stroke="#276749" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="12.5" cy="16" rx="1.5" ry="4" fill="white" opacity="0.2"/>`;

    case 'corn': return `
      <path d="M7 16 C7 11 10 8 11 10 L11 22 C10 25 7 22 7 18Z" fill="#2f855a"/>
      <path d="M25 16 C25 11 22 8 21 10 L21 22 C22 25 25 22 25 18Z" fill="#276749"/>
      <rect x="11" y="9" width="10" height="16" rx="5" fill="#d69e2e"/>
      <line x1="14" y1="9" x2="14" y2="25" stroke="#b7791f" stroke-width="0.9"/>
      <line x1="18" y1="9" x2="18" y2="25" stroke="#b7791f" stroke-width="0.9"/>
      <line x1="11" y1="13" x2="21" y2="13" stroke="#b7791f" stroke-width="0.7"/>
      <line x1="11" y1="17" x2="21" y2="17" stroke="#b7791f" stroke-width="0.7"/>
      <line x1="11" y1="21" x2="21" y2="21" stroke="#b7791f" stroke-width="0.7"/>
      <path d="M14 5 C14 3 15.5 1.5 16 3 C16.5 1.5 18 3 18 5" fill="none" stroke="#b7791f" stroke-width="1.2" stroke-linecap="round"/>`;

    case 'oregano': return `
      <ellipse cx="10" cy="21" rx="5"   ry="6"   fill="#276749"/>
      <ellipse cx="22" cy="21" rx="5"   ry="6"   fill="#2f855a"/>
      <ellipse cx="16" cy="19" rx="6"   ry="7"   fill="#38a169"/>
      <ellipse cx="10" cy="15" rx="4.5" ry="5.5" fill="#48bb78"/>
      <ellipse cx="22" cy="15" rx="4.5" ry="5.5" fill="#276749"/>
      <ellipse cx="16" cy="12" rx="5"   ry="5.5" fill="#68d391"/>
      <line x1="16" y1="27" x2="16" y2="31" stroke="#744210" stroke-width="2" stroke-linecap="round"/>`;

    case 'cilantro': return `
      <path d="M8 22 C8 17 11 12 14 13 C13 10 15 8 16 10 C17 8 19 10 18 13 C21 12 24 17 24 22 C22 25 18 27 16 27 C14 27 10 25 8 22Z" fill="#48bb78"/>
      <path d="M11 20 C12 17 14 15 15 17 M21 20 C20 17 18 15 17 17 M16 10 L16 22" fill="none" stroke="#276749" stroke-width="0.9"/>
      <line x1="16" y1="27" x2="16" y2="31" stroke="#744210" stroke-width="2" stroke-linecap="round"/>`;

    case 'blueberry': return `
      <circle cx="11" cy="21" r="6" fill="#553c9a"/>
      <circle cx="21" cy="21" r="6" fill="#6b46c1"/>
      <circle cx="16" cy="14" r="7" fill="#44337a"/>
      <path d="M9  19 L11 17 L13 19" fill="none" stroke="#e9d8fd" stroke-width="1.2"/>
      <path d="M19 19 L21 17 L23 19" fill="none" stroke="#e9d8fd" stroke-width="1.2"/>
      <path d="M14 12 L16 10 L18 12" fill="none" stroke="#e9d8fd" stroke-width="1.2"/>`;

    case 'watermelon': return `
      <ellipse cx="16" cy="18" rx="13"  ry="10"  fill="#276749"/>
      <ellipse cx="16" cy="18" rx="11"  ry="8.5" fill="#48bb78"/>
      <ellipse cx="16" cy="18" rx="8.5" ry="6.5" fill="#fc8181"/>
      <ellipse cx="12" cy="17" rx="1.2" ry="1.8" fill="#1a202c" transform="rotate(-15 12 17)"/>
      <ellipse cx="17" cy="21" rx="1.2" ry="1.8" fill="#1a202c" transform="rotate(10 17 21)"/>
      <ellipse cx="21" cy="16" rx="1.2" ry="1.8" fill="#1a202c" transform="rotate(-5 21 16)"/>`;

    case 'cantaloupe': return `
      <ellipse cx="16" cy="17" rx="12" ry="11" fill="#ed8936"/>
      <ellipse cx="16" cy="17" rx="10" ry="9"  fill="#f6ad55"/>
      <line x1="16" y1="6"  x2="16" y2="28" stroke="#c05621" stroke-width="0.9" opacity="0.6"/>
      <line x1="4"  y1="17" x2="28" y2="17" stroke="#c05621" stroke-width="0.9" opacity="0.6"/>
      <ellipse cx="16" cy="17" rx="6"  ry="9" fill="none" stroke="#c05621" stroke-width="0.9" opacity="0.5"/>
      <ellipse cx="16" cy="17" rx="10" ry="5" fill="none" stroke="#c05621" stroke-width="0.9" opacity="0.5"/>
      <line x1="16" y1="6"  x2="16" y2="3"  stroke="#276749" stroke-width="2" stroke-linecap="round"/>`;

    case 'honeydew': return `
      <ellipse cx="16" cy="17" rx="12" ry="11" fill="#9ae6b4"/>
      <ellipse cx="16" cy="17" rx="10" ry="9"  fill="#c6f6d5"/>
      <line x1="16" y1="6"  x2="16" y2="28" stroke="#68d391" stroke-width="1"   opacity="0.6"/>
      <line x1="4"  y1="17" x2="28" y2="17" stroke="#68d391" stroke-width="1"   opacity="0.6"/>
      <ellipse cx="16" cy="17" rx="7"  ry="9" fill="none" stroke="#68d391" stroke-width="0.8" opacity="0.5"/>
      <ellipse cx="16" cy="17" rx="10" ry="5" fill="none" stroke="#68d391" stroke-width="0.8" opacity="0.5"/>
      <line x1="16" y1="6"  x2="16" y2="3"  stroke="#276749" stroke-width="2" stroke-linecap="round"/>`;

    case 'summer-squash': return `
      <path d="M5 18 C5 13 9 9 16 9 C21 9 27 12 27 17 C27 22 23 27 17 27 C11 27 5 23 5 18Z" fill="#ecc94b"/>
      <ellipse cx="10" cy="20" rx="3" ry="5" fill="#faf089" opacity="0.5"/>
      <path d="M26 14 C24 9 20 6 17 8" fill="none" stroke="#276749" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M24 11 C26 8 28 7 28 8" fill="none" stroke="#276749" stroke-width="1.5" stroke-linecap="round"/>`;

    case 'carrot': return `
      <line x1="13" y1="6"  x2="11" y2="1"  stroke="#276749" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="16" y1="5"  x2="16" y2="1"  stroke="#38a169" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="19" y1="6"  x2="21" y2="1"  stroke="#2f855a" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M11 5 C13 4 19 4 21 5 L19 20 C18 25 16 31 16 31 C16 31 14 25 13 20Z" fill="#ed8936"/>
      <line x1="14" y1="12" x2="11" y2="16" stroke="#c05621" stroke-width="0.9" stroke-linecap="round"/>
      <line x1="18" y1="14" x2="21" y2="18" stroke="#c05621" stroke-width="0.9" stroke-linecap="round"/>`;

    case 'radish': return `
      <path d="M11 9 C10 6 11 4 13 5 C12 3 14 2 15 4 C16 2 18 3 17 5 C19 4 20 6 19 9" fill="#276749"/>
      <path d="M7 18 C7 13 10 9 16 9 C22 9 25 13 25 18 C25 23 21 28 16 28 C11 28 7 23 7 18Z" fill="#e53e3e"/>
      <path d="M10 24 C10 27 13 30 16 30 C19 30 22 27 22 24 C19 27 13 27 10 24Z" fill="#fff5f5"/>
      <line x1="16" y1="30" x2="16" y2="32" stroke="#e53e3e" stroke-width="1.5" stroke-linecap="round"/>
      <ellipse cx="12" cy="16" rx="1.5" ry="2.5" fill="white" opacity="0.25"/>`;

    case 'onion': return `
      <ellipse cx="16" cy="20" rx="11" ry="10" fill="#c8a882"/>
      <ellipse cx="16" cy="20" rx="9"  ry="8"  fill="#fefcbf"/>
      <path d="M8 20 C8 15 11 11 16 11 C21 11 24 15 24 20" fill="none" stroke="#d69e2e" stroke-width="1"   opacity="0.5"/>
      <path d="M9 23 C10 19 12 15 16 15 C20 15 22 19 23 23" fill="none" stroke="#d69e2e" stroke-width="0.8" opacity="0.4"/>
      <line x1="14" y1="11" x2="13" y2="5" stroke="#276749" stroke-width="2"   stroke-linecap="round"/>
      <line x1="18" y1="11" x2="19" y2="5" stroke="#276749" stroke-width="2"   stroke-linecap="round"/>
      <line x1="16" y1="11" x2="16" y2="4" stroke="#38a169" stroke-width="2"   stroke-linecap="round"/>`;

    case 'chive': return `
      <line x1="9"  y1="30" x2="8"  y2="10" stroke="#276749" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="12" y1="30" x2="11" y2="7"  stroke="#38a169" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="16" y1="30" x2="16" y2="6"  stroke="#276749" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="20" y1="30" x2="21" y2="7"  stroke="#48bb78" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="23" y1="30" x2="24" y2="10" stroke="#276749" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="8"  cy="8"  r="2.5" fill="#9f7aea"/>
      <circle cx="11" cy="5"  r="2.5" fill="#805ad5"/>
      <circle cx="16" cy="4"  r="2.5" fill="#9f7aea"/>
      <circle cx="21" cy="5"  r="2.5" fill="#805ad5"/>
      <circle cx="24" cy="8"  r="2.5" fill="#9f7aea"/>`;

    case 'basil': return `
      <path d="M22 12 C25 10 27 13 26 17 C25 21 22 23 20 21 C22 19 23 16 22 12Z" fill="#2f855a"/>
      <path d="M10 12 C7 10 5 13 6 17 C7 21 10 23 12 21 C10 19 9 16 10 12Z"     fill="#276749"/>
      <path d="M16 5 C20 5 24 9 24 15 C24 21 20 25 16 25 C12 25 8 21 8 15 C8 9 12 5 16 5Z" fill="#38a169"/>
      <line x1="16" y1="6"  x2="16" y2="24" stroke="#276749" stroke-width="0.9" opacity="0.55"/>
      <path d="M16 11 C14 12 12 13 11 15 M16 11 C18 12 20 13 21 15" fill="none" stroke="#276749" stroke-width="0.7" opacity="0.45"/>
      <path d="M16 16 C14 17 12 18 11 20 M16 16 C18 17 20 18 21 20" fill="none" stroke="#276749" stroke-width="0.7" opacity="0.45"/>
      <ellipse cx="13" cy="13" rx="1.5" ry="3" fill="white" opacity="0.2"/>
      <line x1="16" y1="25" x2="16" y2="29" stroke="#744210" stroke-width="2" stroke-linecap="round"/>`;

    default:
      return `<circle cx="16" cy="16" r="12" fill="#a0aec0"/>`;
  }
}

export function getPlant(key) {
  return PLANTS.find(p => p.key === key) ?? null;
}
