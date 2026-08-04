/* @ds-bundle: {"format":4,"namespace":"MaisaDesignSystem_00adcb","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"ChatBubble","sourcePath":"components/product/ChatBubble.jsx"},{"name":"StatCard","sourcePath":"components/product/StatCard.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"797223e0aa90","components/core/Badge.jsx":"87f169a93fa3","components/core/Button.jsx":"06362ba92169","components/core/Card.jsx":"7406447a00ae","components/core/Icon.jsx":"606c341ea645","components/core/IconButton.jsx":"43f04eb90dc8","components/core/Logo.jsx":"87ac0b53d095","components/core/Tag.jsx":"104c12ea6f70","components/feedback/Dialog.jsx":"54e656b33e44","components/feedback/EmptyState.jsx":"ac076824fcd4","components/feedback/Toast.jsx":"a901b015758a","components/feedback/Tooltip.jsx":"2f648dfd4e35","components/forms/Checkbox.jsx":"0c8af8bedb82","components/forms/Input.jsx":"0ce213bb3f50","components/forms/Radio.jsx":"ece85aa07cb6","components/forms/Select.jsx":"14a78551d931","components/forms/Switch.jsx":"d970979d030d","components/forms/Textarea.jsx":"8686c02a2cb9","components/navigation/Tabs.jsx":"6a6feb067a7c","components/product/ChatBubble.jsx":"f6d3cf31bc66","components/product/StatCard.jsx":"1e563d6d68db","ui_kits/app-mobile/Moldura.jsx":"9a44911ae44f","ui_kits/app-mobile/Telas.jsx":"a342ee4b20c0","ui_kits/painel/Agenda.jsx":"722cd6c6e8fb","ui_kits/painel/Ajustes.jsx":"b2adb8278bdb","ui_kits/painel/Clientes.jsx":"b9014107b45c","ui_kits/painel/Conversas.jsx":"194c15439ba5","ui_kits/painel/Inicio.jsx":"d6ccbd74cdf5","ui_kits/painel/Notas.jsx":"27e0d8eed9fa","ui_kits/painel/Shell.jsx":"dc3c7ebde63a","ui_kits/painel/data.js":"2f09edffb66f","ui_kits/site/Header.jsx":"1ba5e82cb3b2","ui_kits/site/Hero.jsx":"3205300a0a88","ui_kits/site/Precos.jsx":"c4d40cb78769","ui_kits/site/Rodape.jsx":"04649a952804","ui_kits/site/Secoes.jsx":"d7c57f6ab64d"},"inlinedExternals":[],"unexposedExports":[{"name":"iconNames","sourcePath":"components/core/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.MaisaDesignSystem_00adcb = window.MaisaDesignSystem_00adcb || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
function Avatar({
  name = '',
  src,
  size = 'md',
  status,
  className = '',
  style,
  ...rest
}) {
  const cls = ['ms-avatar', 'ms-avatar--' + size, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: style,
    title: name || undefined
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    className: "ms-avatar__img",
    src: src,
    alt: name
  }) : initials(name), status && /*#__PURE__*/React.createElement("span", {
    className: 'ms-avatar__status ms-avatar__status--' + status
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ms-badge', 'ms-badge--' + variant, 'ms-badge--' + tone, 'ms-badge--' + size, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "ms-badge__dot"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  as = 'button',
  className = '',
  children,
  ...rest
}) {
  const Tag = as;
  const cls = ['ms-btn', 'ms-btn--' + variant, 'ms-btn--' + size, block && 'ms-btn--block', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    disabled: Tag === 'button' ? disabled || loading : undefined,
    "aria-disabled": disabled || loading || undefined
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "ms-btn__spinner",
    "aria-hidden": "true"
  }) : iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  variant = 'default',
  pad = 'md',
  interactive = false,
  as = 'div',
  className = '',
  children,
  ...rest
}) {
  const Tag = as;
  const cls = ['ms-card', variant !== 'default' && 'ms-card--' + variant, 'ms-card--pad-' + pad, interactive && 'ms-card--interactive', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Ícones: Heroicons v2 (MIT, Tailwind Labs). Os `d` abaixo foram copiados
   verbatim dos SVGs otimizados em assets/icons/. Não desenhe ícones novos —
   copie de assets/icons/ ou do pacote heroicons. */
const OUTLINE = {
  'adjustments-horizontal': `<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"></path>`,
  'arrow-down-tray': `<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"></path>`,
  'arrow-left': `<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"></path>`,
  'arrow-path': `<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path>`,
  'arrow-right': `<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>`,
  'arrow-up-right': `<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"></path>`,
  'banknotes': `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"></path>`,
  'bars-3': `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"></path>`,
  'bell': `<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"></path>`,
  'bolt': `<path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"></path>`,
  'building-storefront': `<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"></path>`,
  'calendar-days': `<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"></path>`,
  'chart-bar': `<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"></path>`,
  'chat-bubble-left-right': `<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"></path>`,
  'chat-bubble-oval-left-ellipsis': `<path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"></path>`,
  'check-circle': `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>`,
  'check': `<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"></path>`,
  'chevron-down': `<path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"></path>`,
  'chevron-left': `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"></path>`,
  'chevron-right': `<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>`,
  'chevron-up': `<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5"></path>`,
  'clock': `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>`,
  'cog-6-tooth': `<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"></path>
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>`,
  'currency-dollar': `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>`,
  'document-text': `<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"></path>`,
  'ellipsis-horizontal': `<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"></path>`,
  'ellipsis-vertical': `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"></path>`,
  'envelope': `<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"></path>`,
  'exclamation-triangle': `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"></path>`,
  'funnel': `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"></path>`,
  'home': `<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"></path>`,
  'information-circle': `<path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"></path>`,
  'link': `<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"></path>`,
  'lock-closed': `<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"></path>`,
  'magnifying-glass': `<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"></path>`,
  'map-pin': `<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"></path>`,
  'paper-airplane': `<path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"></path>`,
  'pencil-square': `<path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"></path>`,
  'phone': `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"></path>`,
  'plus': `<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path>`,
  'question-mark-circle': `<path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"></path>`,
  'receipt-percent': `<path stroke-linecap="round" stroke-linejoin="round" d="m9 14.25 6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"></path>`,
  'shield-check': `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"></path>`,
  'sparkles': `<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"></path>`,
  'squares-2x2': `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"></path>`,
  'star': `<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"></path>`,
  'trash': `<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"></path>`,
  'user-circle': `<path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>`,
  'users': `<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"></path>`,
  'x-mark': `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path>`
};
const SOLID = {
  'bolt': `<path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clip-rule="evenodd"></path>`,
  'calendar-days': `<path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"></path>
  <path fill-rule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clip-rule="evenodd"></path>`,
  'chat-bubble-oval-left-ellipsis': `<path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clip-rule="evenodd"></path>`,
  'check-circle': `<path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"></path>`,
  'exclamation-circle': `<path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"></path>`,
  'sparkles': `<path fill-rule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clip-rule="evenodd"></path>`,
  'star': `<path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"></path>`,
  'user-circle': `<path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clip-rule="evenodd"></path>`
};
const SOLID20 = {
  'arrow-right': `<path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd"></path>`,
  'check': `<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"></path>`,
  'chevron-down': `<path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"></path>`,
  'chevron-right': `<path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"></path>`,
  'information-circle': `<path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd"></path>`,
  'magnifying-glass': `<path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd"></path>`,
  'plus': `<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"></path>`,
  'x-mark': `<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"></path>`
};
const iconNames = {
  outline: Object.keys(OUTLINE),
  solid: Object.keys(SOLID),
  solid20: Object.keys(SOLID20)
};
function Icon({
  name,
  variant = 'outline',
  size = 20,
  strokeWidth = 1.6,
  color = 'currentColor',
  className = '',
  style,
  title,
  ...rest
}) {
  const set = variant === 'solid' ? SOLID : variant === 'solid20' ? SOLID20 : OUTLINE;
  const body = set[name];
  const box = variant === 'solid20' ? 20 : 24;
  if (!body) {
    if (typeof console !== 'undefined') console.warn('[maisa/Icon] ícone não encontrado:', name, variant);
    return null;
  }
  const solid = variant !== 'outline';
  return /*#__PURE__*/React.createElement("svg", _extends({
    role: title ? 'img' : 'presentation',
    "aria-hidden": title ? undefined : 'true',
    focusable: "false",
    width: size,
    height: size,
    viewBox: `0 0 ${box} ${box}`,
    fill: solid ? color : 'none',
    stroke: solid ? 'none' : color,
    strokeWidth: solid ? undefined : strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: {
      flex: '0 0 auto',
      display: 'block',
      ...style
    }
  }, rest, {
    dangerouslySetInnerHTML: {
      __html: (title ? `<title>${title}</title>` : '') + body
    }
  }));
}
Object.assign(__ds_scope, { iconNames, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  round = false,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['ms-iconbtn', 'ms-iconbtn--' + variant, 'ms-iconbtn--' + size, round && 'ms-iconbtn--round', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-label": label,
    title: label,
    disabled: disabled
  }, rest), icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Logo({
  size = 28,
  tone = 'default',
  dot = true,
  as = 'span',
  className = '',
  style,
  ...rest
}) {
  const Tag = as;
  const cls = ['ms-logo', tone !== 'default' && 'ms-logo--' + tone, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    style: {
      fontSize: size,
      ...style
    }
  }, rest), "maisa", dot && /*#__PURE__*/React.createElement("span", {
    className: "ms-logo__dot"
  }, "."));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  selected = false,
  onRemove,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const selectable = Boolean(onClick);
  const cls = ['ms-tag', selectable && 'ms-tag--selectable', selected && 'ms-tag--selected', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    onClick: onClick,
    role: selectable ? 'button' : undefined,
    tabIndex: selectable ? 0 : undefined
  }, rest), children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ms-tag__remove",
    "aria-label": "Remover",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M4.28 4.28a.75.75 0 0 1 1.06 0L10 8.94l4.66-4.66a.75.75 0 1 1 1.06 1.06L11.06 10l4.66 4.66a.75.75 0 1 1-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 0 1-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 0 1 0-1.06Z",
    clipRule: "evenodd"
  }))));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  title,
  description,
  size = 'md',
  onClose,
  footer,
  className = '',
  children
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "ms-dialog__overlay",
    onClick: onClose,
    role: "presentation"
  }, /*#__PURE__*/React.createElement("div", {
    className: ['ms-dialog', size !== 'md' && 'ms-dialog--' + size, className].filter(Boolean).join(' '),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    onClick: e => e.stopPropagation()
  }, onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ms-iconbtn ms-iconbtn--sm ms-iconbtn--ghost ms-dialog__close",
    "aria-label": "Fechar",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M4.28 4.28a.75.75 0 0 1 1.06 0L10 8.94l4.66-4.66a.75.75 0 1 1 1.06 1.06L11.06 10l4.66 4.66a.75.75 0 1 1-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 0 1-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 0 1 0-1.06Z",
    clipRule: "evenodd"
  }))), title && /*#__PURE__*/React.createElement("div", {
    className: "ms-dialog__head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ms-dialog__title"
  }, title)), description && /*#__PURE__*/React.createElement("p", {
    className: "ms-dialog__desc"
  }, description), children && /*#__PURE__*/React.createElement("div", {
    className: "ms-dialog__body"
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "ms-dialog__foot"
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['ms-empty', className].filter(Boolean).join(' ')
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "ms-empty__icon"
  }, icon), title && /*#__PURE__*/React.createElement("h3", {
    className: "ms-empty__title"
  }, title), description && /*#__PURE__*/React.createElement("p", {
    className: "ms-empty__desc"
  }, description), action && /*#__PURE__*/React.createElement("div", {
    className: "ms-empty__action"
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const GLYPH = {
  success: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z",
    clipRule: "evenodd"
  })),
  danger: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z",
    clipRule: "evenodd"
  })),
  info: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z",
    clipRule: "evenodd"
  })),
  warning: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z",
    clipRule: "evenodd"
  }))
};
function Toast({
  tone = 'success',
  title,
  description,
  action,
  onClose,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['ms-toast', 'ms-toast--' + tone, className].filter(Boolean).join(' '),
    role: "status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-toast__icon"
  }, GLYPH[tone]), /*#__PURE__*/React.createElement("div", {
    className: "ms-toast__body"
  }, title && /*#__PURE__*/React.createElement("span", {
    className: "ms-toast__title"
  }, title), description && /*#__PURE__*/React.createElement("span", {
    className: "ms-toast__desc"
  }, description), action), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ms-iconbtn ms-iconbtn--sm ms-iconbtn--ghost",
    "aria-label": "Fechar aviso",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M4.28 4.28a.75.75 0 0 1 1.06 0L10 8.94l4.66-4.66a.75.75 0 1 1 1.06 1.06L11.06 10l4.66 4.66a.75.75 0 1 1-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 0 1-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 0 1 0-1.06Z",
    clipRule: "evenodd"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  content,
  side = 'top',
  children,
  className = ''
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    className: ['ms-tooltip', className].filter(Boolean).join(' '),
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, children, open && /*#__PURE__*/React.createElement("span", {
    className: 'ms-tooltip__bubble ms-tooltip__bubble--' + side,
    role: "tooltip"
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  description,
  checked,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['ms-check', disabled && 'ms-check--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: 'ms-check__box' + (checked ? ' ms-check__box--checked' : '')
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z",
    clipRule: "evenodd"
  }))), (label || description) && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__text"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__label"
  }, label), description && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__desc"
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field({
  label,
  hint,
  error,
  optional,
  htmlFor,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ms-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ms-field__label",
    htmlFor: htmlFor
  }, label, optional && /*#__PURE__*/React.createElement("span", {
    className: "ms-field__optional"
  }, " (opcional)")), children, error ? /*#__PURE__*/React.createElement("span", {
    className: "ms-field__error"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "ms-field__hint"
  }, hint) : null);
}
function Input({
  label,
  hint,
  error,
  optional,
  size = 'md',
  prefix,
  suffix,
  id,
  className = '',
  ...rest
}) {
  const cls = ['ms-input', size !== 'md' && 'ms-input--' + size, error && 'ms-input--invalid', prefix && 'ms-input--with-prefix', suffix && 'ms-input--with-suffix', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    hint: hint,
    error: error,
    optional: optional,
    htmlFor: id
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-input-wrap"
  }, prefix && /*#__PURE__*/React.createElement("span", {
    className: "ms-input__affix ms-input__affix--prefix"
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    className: cls,
    "aria-invalid": error ? true : undefined
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    className: "ms-input__affix ms-input__affix--suffix"
  }, suffix)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  description,
  checked,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['ms-check', disabled && 'ms-check--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    checked: checked,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: 'ms-check__box ms-check__box--radio' + (checked ? ' ms-check__box--checked' : '')
  }, checked && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__radio-dot"
  })), (label || description) && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__text"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__label"
  }, label), description && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__desc"
  }, description)));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field({
  label,
  hint,
  error,
  optional,
  htmlFor,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ms-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ms-field__label",
    htmlFor: htmlFor
  }, label, optional && /*#__PURE__*/React.createElement("span", {
    className: "ms-field__optional"
  }, " (opcional)")), children, error ? /*#__PURE__*/React.createElement("span", {
    className: "ms-field__error"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "ms-field__hint"
  }, hint) : null);
}
function Select({
  label,
  hint,
  error,
  optional,
  size = 'md',
  options = [],
  placeholder,
  id,
  className = '',
  children,
  ...rest
}) {
  const cls = ['ms-select', size !== 'md' && 'ms-select--' + size, error && 'ms-input--invalid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    hint: hint,
    error: error,
    optional: optional,
    htmlFor: id
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-select-wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: id,
    className: cls
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)), children), /*#__PURE__*/React.createElement("span", {
    className: "ms-select__chevron"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z",
    clipRule: "evenodd"
  })))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  checked = false,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['ms-switch', disabled && 'ms-switch--disabled', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: 'ms-switch__track' + (checked ? ' ms-switch__track--on' : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-switch__knob"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "ms-check__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field({
  label,
  hint,
  error,
  optional,
  htmlFor,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ms-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ms-field__label",
    htmlFor: htmlFor
  }, label, optional && /*#__PURE__*/React.createElement("span", {
    className: "ms-field__optional"
  }, " (opcional)")), children, error ? /*#__PURE__*/React.createElement("span", {
    className: "ms-field__error"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "ms-field__hint"
  }, hint) : null);
}
function Textarea({
  label,
  hint,
  error,
  optional,
  id,
  rows = 4,
  className = '',
  ...rest
}) {
  const cls = ['ms-textarea', error && 'ms-textarea--invalid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    hint: hint,
    error: error,
    optional: optional,
    htmlFor: id
  }, /*#__PURE__*/React.createElement("textarea", _extends({
    id: id,
    rows: rows,
    className: cls,
    "aria-invalid": error ? true : undefined
  }, rest)));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange,
  variant = 'underline',
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['ms-tabs', 'ms-tabs--' + variant, className].filter(Boolean).join(' '),
    role: "tablist"
  }, items.map(it => {
    const active = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      type: "button",
      role: "tab",
      "aria-selected": active,
      className: 'ms-tab' + (active ? ' ms-tab--active' : ''),
      onClick: () => onChange && onChange(it.value)
    }, it.icon, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
      className: "ms-tab__count"
    }, it.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/product/ChatBubble.jsx
try { (() => {
function ChatBubble({
  from = 'in',
  author,
  time,
  status,
  children,
  className = ''
}) {
  if (from === 'note') {
    return /*#__PURE__*/React.createElement("div", {
      className: "ms-chat-row",
      style: {
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ms-bubble ms-bubble--note"
    }, children));
  }
  const out = from === 'out';
  return /*#__PURE__*/React.createElement("div", {
    className: ['ms-chat-row', out && 'ms-chat-row--out', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("div", {
    className: 'ms-bubble ms-bubble--' + (out ? 'out' : 'in')
  }, author && /*#__PURE__*/React.createElement("span", {
    className: "ms-bubble__author"
  }, author), /*#__PURE__*/React.createElement("div", null, children), (time || status) && /*#__PURE__*/React.createElement("div", {
    className: "ms-bubble__meta"
  }, time, status === 'read' && /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "10",
    viewBox: "0 0 18 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 6.5 4 9.5 10 2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.5 8.6 8.8 9.9 15 2.5"
  })), status === 'sent' && /*#__PURE__*/React.createElement("svg", {
    width: "10",
    height: "10",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 6.5 4 9.5 11 2.5"
  })))));
}
Object.assign(__ds_scope, { ChatBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/product/ChatBubble.jsx", error: String((e && e.message) || e) }); }

// components/product/StatCard.jsx
try { (() => {
function StatCard({
  label,
  value,
  icon,
  delta,
  deltaDirection = 'up',
  footnote,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['ms-card', 'ms-card--pad-md', 'ms-stat', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-stat__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-stat__label"
  }, label), icon && /*#__PURE__*/React.createElement("span", {
    className: "ms-stat__icon"
  }, icon)), /*#__PURE__*/React.createElement("span", {
    className: "ms-stat__value"
  }, value), (delta || footnote) && /*#__PURE__*/React.createElement("div", {
    className: "ms-stat__foot"
  }, delta && /*#__PURE__*/React.createElement("span", {
    className: 'ms-stat__delta ms-stat__delta--' + deltaDirection
  }, deltaDirection === 'up' ? '↑' : '↓', " ", delta), footnote && /*#__PURE__*/React.createElement("span", null, footnote)));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/product/StatCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-mobile/Moldura.jsx
try { (() => {
const {
  Icon
} = window.MaisaDesignSystem_00adcb;
function Moldura({
  children,
  tab,
  setTab
}) {
  const abas = [{
    id: 'hoje',
    label: 'Hoje',
    icon: 'home'
  }, {
    id: 'conversas',
    label: 'Conversas',
    icon: 'chat-bubble-left-right',
    badge: 2
  }, {
    id: 'agenda',
    label: 'Agenda',
    icon: 'calendar-days'
  }, {
    id: 'notas',
    label: 'Notas',
    icon: 'document-text'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 844,
      borderRadius: 46,
      background: 'var(--ink-900)',
      padding: 10,
      boxShadow: 'var(--shadow-lg)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      borderRadius: 37,
      background: 'var(--surface-page)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 50,
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 26px',
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-strong)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, "14:32"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 5,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "11",
    viewBox: "0 0 17 11",
    fill: "currentColor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7",
    width: "3",
    height: "4",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "5",
    width: "3",
    height: "6",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "2.5",
    width: "3",
    height: "8.5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "0",
    width: "3",
    height: "11",
    rx: "1"
  })), /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "11",
    viewBox: "0 0 24 12",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "20",
    height: "11",
    rx: "3.2",
    stroke: "currentColor",
    opacity: ".4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "15",
    height: "8",
    rx: "2",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 4v4a2.2 2.2 0 0 0 0-4Z",
    fill: "currentColor",
    opacity: ".4"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto',
      display: 'flex',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)',
      padding: '8px 6px 22px'
    }
  }, abas.map(a => {
    const on = a.id === tab;
    return /*#__PURE__*/React.createElement("button", {
      key: a.id,
      onClick: () => setTab(a.id),
      style: {
        flex: 1,
        minHeight: 'var(--tap-min)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        color: on ? 'var(--brand-text)' : 'var(--text-subtle)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: a.icon,
      variant: on ? 'solid' : 'outline',
      size: 23
    }), a.badge && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -3,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 999,
        background: 'var(--danger)',
        color: '#fff',
        fontSize: 10,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px'
      }
    }, a.badge)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        fontWeight: on ? 600 : 500
      }
    }, a.label));
  }))));
}
function TopoApp({
  titulo,
  sub,
  acao
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h2)',
      fontSize: 28,
      letterSpacing: 'var(--tracking-display)'
    }
  }, titulo), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, sub)), acao);
}
Object.assign(window, {
  Moldura,
  TopoApp
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-mobile/Moldura.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-mobile/Telas.jsx
try { (() => {
const {
  Card,
  Icon,
  IconButton,
  Badge,
  Button,
  Avatar,
  ChatBubble,
  StatCard,
  Switch,
  EmptyState,
  Tabs
} = window.MaisaDesignSystem_00adcb;
const TOM = {
  confirmado: 'success',
  aguardando: 'warning',
  cancelado: 'danger'
};
const ROT = {
  confirmado: 'Confirmado',
  aguardando: 'Aguardando',
  cancelado: 'Cancelado'
};
function Hoje({
  setTab
}) {
  const d = window.MS_DATA;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 0 20px'
    }
  }, /*#__PURE__*/React.createElement(TopoApp, {
    titulo: "Boa tarde, Renata",
    sub: "Quinta, 27 de julho",
    acao: /*#__PURE__*/React.createElement(IconButton, {
      variant: "outline",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "bell",
        size: 19
      }),
      label: "Avisos"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "inverse",
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 18,
    color: "var(--green-300)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--green-300)'
    }
  }, "maisa hoje")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--cream-50)',
      marginTop: 10,
      lineHeight: 1.3
    }
  }, "31 mensagens respondidas e 4 hor\xE1rios marcados."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--green-200)',
      marginTop: 8
    }
  }, "S\xF3 uma coisa precisa de voc\xEA."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "sm",
    onClick: () => setTab('notas')
  }, "Ver o que \xE9"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Atendimentos",
    value: "6",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 17
    }),
    footnote: "hoje"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "A receber",
    value: "R$ 1.060",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "banknotes",
      size: 17
    }),
    footnote: "hoje"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h3)',
      fontSize: 18
    }
  }, "Agenda de hoje"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('agenda'),
    style: {
      border: 0,
      background: 'transparent',
      color: 'var(--brand-text)',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Ver tudo")), d.agenda.slice(0, 4).map(a => /*#__PURE__*/React.createElement(Card, {
    key: a.hora,
    pad: "sm",
    style: {
      opacity: a.status === 'cancelado' ? .55 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-strong)'
    }
  }, a.hora), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--text-subtle)'
    }
  }, a.dur)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, a.cliente), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, a.servico, " \xB7 ", a.valor)), /*#__PURE__*/React.createElement(Badge, {
    tone: TOM[a.status],
    size: "sm"
  }, ROT[a.status]))))));
}
function ListaConversas({
  abrir
}) {
  const d = window.MS_DATA;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(TopoApp, {
    titulo: "Conversas",
    sub: "2 esperando voc\xEA",
    acao: /*#__PURE__*/React.createElement(IconButton, {
      variant: "outline",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "magnifying-glass",
        size: 19
      }),
      label: "Buscar"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 10px'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    variant: "pill",
    value: "todas",
    onChange: () => {},
    items: [{
      value: 'todas',
      label: 'Todas'
    }, {
      value: 'aberto',
      label: 'Em aberto'
    }, {
      value: 'maisa',
      label: 'maisa'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, d.conversas.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => abrir(c.id),
    style: {
      display: 'flex',
      gap: 12,
      width: '100%',
      minHeight: 'var(--tap-min)',
      padding: '14px 20px',
      border: 0,
      borderBottom: '1px solid var(--border-subtle)',
      background: 'transparent',
      textAlign: 'left',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.nome,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.nome), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-subtle)',
      fontFamily: 'var(--font-mono)'
    }
  }, c.hora)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      marginTop: 3
    }
  }, c.porMaisa && /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 13,
    color: "var(--brand)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.ultima), c.naoLidas > 0 && /*#__PURE__*/React.createElement("span", {
    className: "ms-badge ms-badge--solid ms-badge--brand ms-badge--sm"
  }, c.naoLidas)))))));
}
function Conversa({
  id,
  voltar
}) {
  const d = window.MS_DATA;
  const c = d.conversas.find(x => x.id === id);
  const msgs = d.thread[id] || [{
    from: 'note',
    txt: 'Nenhuma mensagem por aqui ainda.'
  }];
  const [auto, setAuto] = React.useState(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 14px 12px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 22
    }),
    label: "Voltar",
    onClick: voltar
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: c.nome,
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, c.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)'
    }
  }, c.tel)), /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "ellipsis-vertical",
      size: 20
    }),
    label: "Op\xE7\xF5es"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: 'var(--accent-soft)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 16,
    color: "var(--accent-text)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 12.5,
      color: 'var(--ochre-700)'
    }
  }, "A maisa est\xE1 cuidando desta conversa"), /*#__PURE__*/React.createElement(Switch, {
    checked: auto,
    onChange: e => setAuto(e.target.checked)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 14px',
      background: 'var(--surface-sunken)'
    }
  }, msgs.map((m, i) => /*#__PURE__*/React.createElement(ChatBubble, {
    key: i,
    from: m.from,
    author: m.a,
    time: m.t,
    status: m.s
  }, m.txt))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      padding: '12px 14px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "ms-input ms-input--sm",
    placeholder: "Assumir a conversa"
  }), /*#__PURE__*/React.createElement(IconButton, {
    variant: "solid",
    round: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "paper-airplane",
      size: 18
    }),
    label: "Enviar"
  })));
}
function AgendaMob() {
  const d = window.MS_DATA;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement(TopoApp, {
    titulo: "Agenda",
    sub: "Quinta, 27 de julho",
    acao: /*#__PURE__*/React.createElement(IconButton, {
      variant: "solid",
      round: true,
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 20
      }),
      label: "Novo agendamento"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '0 20px 16px',
      overflowX: 'auto'
    }
  }, [['seg', 24], ['ter', 25], ['qua', 26], ['qui', 27], ['sex', 28], ['sáb', 29], ['dom', 30]].map(([dia, n]) => {
    const on = n === 27;
    return /*#__PURE__*/React.createElement("div", {
      key: n,
      style: {
        flex: '0 0 auto',
        width: 46,
        minHeight: 'var(--tap-min)',
        padding: '8px 0',
        textAlign: 'center',
        borderRadius: 'var(--radius-md)',
        background: on ? 'var(--brand)' : 'var(--surface-card)',
        border: '1px solid ' + (on ? 'var(--brand)' : 'var(--border-subtle)'),
        color: on ? '#fff' : 'var(--text-body)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        opacity: .8
      }
    }, dia), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 18,
        fontWeight: 700
      }
    }, n));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, d.agenda.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.hora,
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      flex: '0 0 auto',
      paddingTop: 12,
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-subtle)'
    }
  }, a.hora), /*#__PURE__*/React.createElement(Card, {
    pad: "sm",
    style: {
      flex: 1,
      opacity: a.status === 'cancelado' ? .55 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, a.cliente), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, a.servico, " \xB7 ", a.dur)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-body)'
    }
  }, a.valor)))))));
}
const TOM_NF = {
  emitida: 'success',
  processando: 'info',
  erro: 'danger',
  cancelada: 'neutral'
};
const ROT_NF = {
  emitida: 'Emitida',
  processando: 'Processando',
  erro: 'Não saiu',
  cancelada: 'Cancelada'
};
function NotasMob() {
  const d = window.MS_DATA;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement(TopoApp, {
    titulo: "Notas fiscais",
    sub: "Julho \xB7 112 emitidas",
    acao: /*#__PURE__*/React.createElement(IconButton, {
      variant: "solid",
      round: true,
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 20
      }),
      label: "Emitir nota"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 14px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "accent",
    pad: "sm"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "exclamation-triangle",
    size: 19,
    color: "var(--accent-text)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--accent-text)'
    }
  }, "Uma nota n\xE3o saiu"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--ochre-700)',
      marginTop: 2,
      lineHeight: 1.5
    }
  }, "O CPF do Caio Ferraz tem um d\xEDgito a mais."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "sm"
  }, "Arrumar")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, d.notas.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 20px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, n.cliente), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)'
    }
  }, "NF ", n.num, " \xB7 ", n.data)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--text-strong)'
    }
  }, n.valor), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: TOM_NF[n.status],
    size: "sm"
  }, ROT_NF[n.status])))))));
}
Object.assign(window, {
  Hoje,
  ListaConversas,
  Conversa,
  AgendaMob,
  NotasMob
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-mobile/Telas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/Agenda.jsx
try { (() => {
const {
  Card,
  Icon,
  Badge,
  Button,
  Avatar,
  Tabs,
  IconButton
} = window.MaisaDesignSystem_00adcb;
const HORAS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const DIAS = [{
  d: 'seg',
  n: 24
}, {
  d: 'ter',
  n: 25
}, {
  d: 'qua',
  n: 26
}, {
  d: 'qui',
  n: 27,
  hoje: true
}, {
  d: 'sex',
  n: 28
}, {
  d: 'sáb',
  n: 29
}, {
  d: 'dom',
  n: 30
}];
const BLOCOS = [{
  dia: 0,
  h: 1,
  dur: 1,
  cliente: 'Ana Beatriz',
  serv: 'Corte',
  tom: 'brand'
}, {
  dia: 1,
  h: 3,
  dur: 2,
  cliente: 'Marina C.',
  serv: 'Coloração',
  tom: 'brand'
}, {
  dia: 2,
  h: 2,
  dur: 1,
  cliente: 'Léo Prado',
  serv: 'Barba',
  tom: 'brand'
}, {
  dia: 3,
  h: 1,
  dur: 1,
  cliente: 'Juliana Prado',
  serv: 'Corte + escova',
  tom: 'brand'
}, {
  dia: 3,
  h: 2,
  dur: 1,
  cliente: 'Marcos Aurélio',
  serv: 'Barba',
  tom: 'brand'
}, {
  dia: 3,
  h: 3.5,
  dur: 1.5,
  cliente: 'Beatriz Nunes',
  serv: 'Coloração',
  tom: 'accent'
}, {
  dia: 3,
  h: 5,
  dur: 1,
  cliente: 'Caio Ferraz',
  serv: 'Corte',
  tom: 'brand'
}, {
  dia: 3,
  h: 9,
  dur: 1,
  cliente: 'Pedro Lemos',
  serv: 'Corte + barba',
  tom: 'brand'
}, {
  dia: 4,
  h: 2,
  dur: 1.5,
  cliente: 'Rita Alencar',
  serv: 'Hidratação',
  tom: 'brand'
}, {
  dia: 4,
  h: 6,
  dur: 1,
  cliente: 'Nina Toledo',
  serv: 'Corte',
  tom: 'brand'
}, {
  dia: 5,
  h: 1,
  dur: 2,
  cliente: 'Fernanda D.',
  serv: 'Progressiva',
  tom: 'brand'
}];
const ALT = 52;
function Agenda() {
  const [vis, setVis] = React.useState('semana');
  return /*#__PURE__*/React.createElement(Card, {
    pad: "none",
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 18px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    variant: "outline",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 17
    }),
    label: "Semana anterior"
  }), /*#__PURE__*/React.createElement(IconButton, {
    variant: "outline",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17
    }),
    label: "Pr\xF3xima semana"
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h3)',
      flex: 1
    }
  }, "24 \u2013 30 de julho"), /*#__PURE__*/React.createElement(Tabs, {
    variant: "pill",
    value: vis,
    onChange: setVis,
    items: [{
      value: 'dia',
      label: 'Dia'
    }, {
      value: 'semana',
      label: 'Semana'
    }, {
      value: 'mes',
      label: 'Mês'
    }]
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    })
  }, "Novo agendamento")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '64px repeat(7,1fr)',
      minWidth: 860
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      background: 'var(--surface-card)',
      zIndex: 2
    }
  }), DIAS.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.n,
    style: {
      padding: '10px 8px',
      textAlign: 'center',
      borderLeft: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      background: d.hoje ? 'var(--green-50)' : 'var(--surface-card)',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-caps)',
      color: d.hoje ? 'var(--brand-text)' : 'var(--text-subtle)',
      fontWeight: 600
    }
  }, d.d), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 21,
      fontWeight: 700,
      color: d.hoje ? 'var(--brand-text)' : 'var(--text-strong)'
    }
  }, d.n))), /*#__PURE__*/React.createElement("div", null, HORAS.map(h => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      height: ALT,
      borderBottom: '1px solid var(--border-subtle)',
      paddingRight: 8,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-subtle)',
      paddingTop: 4
    }
  }, h))), DIAS.map((d, di) => /*#__PURE__*/React.createElement("div", {
    key: d.n,
    style: {
      position: 'relative',
      borderLeft: '1px solid var(--border-subtle)',
      background: d.hoje ? 'var(--green-50)' : 'transparent'
    }
  }, HORAS.map(h => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      height: ALT,
      borderBottom: '1px solid var(--border-subtle)'
    }
  })), BLOCOS.filter(b => b.dia === di).map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      left: 4,
      right: 4,
      top: b.h * ALT + 3,
      height: b.dur * ALT - 6,
      background: b.tom === 'accent' ? 'var(--accent-soft)' : 'var(--brand-soft)',
      border: '1px solid ' + (b.tom === 'accent' ? 'var(--ochre-200)' : 'var(--green-200)'),
      borderRadius: 'var(--radius-sm)',
      padding: '6px 8px',
      overflow: 'hidden',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: b.tom === 'accent' ? 'var(--accent-text)' : 'var(--green-800)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, b.cliente), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: b.tom === 'accent' ? 'var(--ochre-600)' : 'var(--green-600)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, b.serv))))))));
}
Object.assign(window, {
  Agenda
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/Agenda.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/Ajustes.jsx
try { (() => {
const {
  Card,
  Icon,
  Badge,
  Button,
  Switch,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Tag
} = window.MaisaDesignSystem_00adcb;
function Secao({
  titulo,
  desc,
  children
}) {
  return /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h3)'
    }
  }, titulo), desc && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)',
      marginTop: 4,
      maxWidth: '62ch'
    }
  }, desc), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, children));
}
function Ajustes() {
  const [auto, setAuto] = React.useState(true);
  const [nf, setNf] = React.useState(true);
  const [lembrete, setLembrete] = React.useState(true);
  const [ferias, setFerias] = React.useState(false);
  const [tom, setTom] = React.useState('proxima');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: 14,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Secao, {
    titulo: "Como a maisa atende",
    desc: "Ela responde no WhatsApp do Studio Lasca. Voc\xEA entra na conversa quando quiser \u2014 \xE9 s\xF3 digitar."
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: auto,
    onChange: e => setAuto(e.target.checked),
    label: "Responder sozinha"
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: lembrete,
    onChange: e => setLembrete(e.target.checked),
    label: "Lembrar o cliente 24h antes"
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: ferias,
    onChange: e => setFerias(e.target.checked),
    label: "Modo f\xE9rias \u2014 avisa que voc\xEA volta dia 10"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-subtle)',
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      marginBottom: 10
    }
  }, "Jeito de falar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Radio, {
    name: "tom",
    checked: tom === 'proxima',
    onChange: () => setTom('proxima'),
    label: "Pr\xF3xima",
    description: "\u201COi, Juliana! Tenho 9h ou 10h30, qual fica melhor?\u201D"
  }), /*#__PURE__*/React.createElement(Radio, {
    name: "tom",
    checked: tom === 'formal',
    onChange: () => setTom('formal'),
    label: "Mais formal",
    description: "\u201COl\xE1, Juliana. Temos disponibilidade \xE0s 9h ou 10h30.\u201D"
  }))), /*#__PURE__*/React.createElement(Textarea, {
    label: "Regras suas",
    hint: "A maisa segue isso antes de qualquer outra coisa.",
    rows: 3,
    defaultValue: 'Sempre oferecer horário de manhã primeiro.\nColoração só com sinal de 30% pago no Pix.'
  })), /*#__PURE__*/React.createElement(Secao, {
    titulo: "Nota fiscal",
    desc: "Emiss\xE3o autom\xE1tica pela prefeitura de S\xE3o Paulo. Certificado A1 v\xE1lido at\xE9 03/2027."
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: nf,
    onChange: e => setNf(e.target.checked),
    label: "Emitir assim que o cliente pagar"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "CNPJ do neg\xF3cio",
    defaultValue: "41.882.330/0001-07"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Regime tribut\xE1rio",
    options: ['Simples Nacional', 'Lucro presumido']
  })), /*#__PURE__*/React.createElement(Checkbox, {
    checked: true,
    onChange: () => {},
    label: "Mandar o link da nota no WhatsApp",
    description: "O cliente recebe junto com o agradecimento."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)'
    }
  }, "WhatsApp conectado"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'var(--success-soft)',
      color: 'var(--success-text)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    variant: "solid",
    size: 20
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--text-strong)'
    }
  }, "11 3771-9002"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, "ativo h\xE1 8 meses"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    block: true
  }, "Trocar n\xFAmero"))), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)'
    }
  }, "Servi\xE7os"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, "O que a maisa pode agendar e cobrar."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginTop: 14
    }
  }, [['Corte + escova', '45 min', 'R$ 180'], ['Barba', '30 min', 'R$ 70'], ['Coloração', '1h30', 'R$ 420'], ['Hidratação', '1h', 'R$ 150']].map(([n, d, v]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, d)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      color: 'var(--text-body)'
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "soft",
    size: "sm",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    })
  }, "Adicionar servi\xE7o")))));
}
Object.assign(window, {
  Ajustes,
  Secao
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/Ajustes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/Clientes.jsx
try { (() => {
const {
  Card,
  Icon,
  IconButton,
  Badge,
  Button,
  Avatar,
  Tag,
  Input
} = window.MaisaDesignSystem_00adcb;
const CLIENTES = [{
  nome: 'Juliana Prado',
  tel: '11 91234-5678',
  ultimo: '27/07/2026',
  atend: 14,
  gasto: 'R$ 2.310',
  tags: ['VIP']
}, {
  nome: 'Marcos Aurélio',
  tel: '11 98877-1200',
  ultimo: '27/07/2026',
  atend: 9,
  gasto: 'R$ 630',
  tags: []
}, {
  nome: 'Beatriz Nunes',
  tel: '11 99610-4477',
  ultimo: '26/07/2026',
  atend: 3,
  gasto: 'R$ 1.260',
  tags: ['Orçamento']
}, {
  nome: 'Caio Ferraz',
  tel: '11 94422-8899',
  ultimo: '26/07/2026',
  atend: 21,
  gasto: 'R$ 1.890',
  tags: ['VIP']
}, {
  nome: 'Pedro Lemos',
  tel: '11 93311-7788',
  ultimo: '25/07/2026',
  atend: 6,
  gasto: 'R$ 840',
  tags: []
}, {
  nome: 'Sandra Vitório',
  tel: '11 97010-3355',
  ultimo: '24/07/2026',
  atend: 2,
  gasto: 'R$ 300',
  tags: ['Faltou 1x']
}];
function Clientes() {
  return /*#__PURE__*/React.createElement(Card, {
    pad: "none",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 18px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 280
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-input__affix ms-input__affix--prefix"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "magnifying-glass",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "ms-input ms-input--sm ms-input--with-prefix",
    placeholder: "Buscar por nome ou telefone"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "218 clientes"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    })
  }, "Adicionar cliente"))), CLIENTES.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.nome,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 18px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.nome,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, c.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)'
    }
  }, c.tel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, c.tags.map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 32,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-subtle)'
    }
  }, "Atendimentos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--text-strong)'
    }
  }, c.atend)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-subtle)'
    }
  }, "Total"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--text-strong)'
    }
  }, c.gasto)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-subtle)'
    }
  }, "\xDAltimo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--text-body)'
    }
  }, c.ultimo)), /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "chat-bubble-oval-left-ellipsis",
      size: 19
    }),
    label: "Abrir conversa"
  })))));
}
Object.assign(window, {
  Clientes
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/Clientes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/Conversas.jsx
try { (() => {
const {
  Card,
  Icon,
  IconButton,
  Badge,
  Button,
  Avatar,
  ChatBubble,
  Tag,
  Tabs,
  Switch
} = window.MaisaDesignSystem_00adcb;
function Conversas({
  onEmitir
}) {
  const d = window.MS_DATA;
  const [sel, setSel] = React.useState(1);
  const [filtro, setFiltro] = React.useState('todas');
  const [texto, setTexto] = React.useState('');
  const [auto, setAuto] = React.useState(true);
  const conversa = d.conversas.find(c => c.id === sel);
  const msgs = d.thread[sel] || [{
    from: 'note',
    txt: 'Nenhuma mensagem nesta conversa ainda.'
  }];
  const lista = filtro === 'aberto' ? d.conversas.filter(c => c.naoLidas > 0) : filtro === 'maisa' ? d.conversas.filter(c => c.porMaisa) : d.conversas;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '300px 1fr 280px',
      gap: 14,
      height: '100%',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "none",
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    variant: "pill",
    value: filtro,
    onChange: setFiltro,
    items: [{
      value: 'todas',
      label: 'Todas'
    }, {
      value: 'aberto',
      label: 'Em aberto'
    }, {
      value: 'maisa',
      label: 'maisa'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: 'auto',
      flex: 1
    }
  }, lista.map(c => {
    const on = c.id === sel;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => setSel(c.id),
      style: {
        display: 'flex',
        gap: 11,
        width: '100%',
        padding: '13px 14px',
        border: 0,
        borderBottom: '1px solid var(--border-subtle)',
        background: on ? 'var(--brand-soft)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'var(--transition-control)'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: c.nome,
      size: "md"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        alignItems: 'baseline'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-strong)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, c.nome), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--text-subtle)',
        fontFamily: 'var(--font-mono)'
      }
    }, c.hora)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        marginTop: 2
      }
    }, c.porMaisa && /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 13,
      color: "var(--brand)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, c.ultima), c.naoLidas > 0 && /*#__PURE__*/React.createElement("span", {
      className: "ms-badge ms-badge--solid ms-badge--brand ms-badge--sm"
    }, c.naoLidas))));
  }))), /*#__PURE__*/React.createElement(Card, {
    pad: "none",
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: conversa.nome,
    size: "md",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, conversa.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)'
    }
  }, conversa.tel)), /*#__PURE__*/React.createElement(Switch, {
    checked: auto,
    onChange: e => setAuto(e.target.checked),
    label: "maisa responde"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "ellipsis-vertical"
    }),
    label: "Mais op\xE7\xF5es"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 18,
      background: 'var(--surface-sunken)'
    }
  }, msgs.map((m, i) => /*#__PURE__*/React.createElement(ChatBubble, {
    key: i,
    from: m.from,
    author: m.a,
    time: m.t,
    status: m.s
  }, m.txt))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      padding: 14,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "ms-input",
    value: texto,
    onChange: e => setTexto(e.target.value),
    placeholder: auto ? 'A maisa está cuidando. Escreva para assumir a conversa.' : 'Escreva uma mensagem'
  }), /*#__PURE__*/React.createElement(IconButton, {
    variant: "solid",
    round: true,
    size: "md",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "paper-airplane",
      size: 19
    }),
    label: "Enviar",
    onClick: () => setTexto('')
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: conversa.nome,
    size: "xl"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, conversa.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  }, conversa.tags.map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t
  }, t)), /*#__PURE__*/React.createElement(Tag, null, "Cliente desde 2024"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      marginTop: 16,
      paddingTop: 14,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-subtle)'
    }
  }, "Atendimentos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 17,
      color: 'var(--text-strong)'
    }
  }, "14")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-subtle)'
    }
  }, "Total gasto"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 17,
      color: 'var(--text-strong)'
    }
  }, "R$ 2.310")))), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-caps)',
      fontSize: 11
    }
  }, "Pr\xF3ximo atendimento"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'var(--brand-soft)',
      color: 'var(--brand-text)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar-days",
    size: 19
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, "Quinta, 9h"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "Corte + escova \xB7 R$ 180"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    block: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "document-text",
      size: 17
    }),
    onClick: onEmitir
  }, "Emitir nota fiscal"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    block: true
  }, "Reagendar")))));
}
Object.assign(window, {
  Conversas
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/Conversas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/Inicio.jsx
try { (() => {
const {
  Card,
  Icon,
  Badge,
  Button,
  StatCard,
  Avatar,
  EmptyState
} = window.MaisaDesignSystem_00adcb;
const TOM = {
  confirmado: 'success',
  aguardando: 'warning',
  cancelado: 'danger'
};
const ROTULO = {
  confirmado: 'Confirmado',
  aguardando: 'Aguardando',
  cancelado: 'Cancelado'
};
function LinhaAgenda({
  a
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '13px 0',
      borderTop: '1px solid var(--border-subtle)',
      opacity: a.status === 'cancelado' ? .55 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 62,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-strong)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, a.hora), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-subtle)'
    }
  }, a.dur)), /*#__PURE__*/React.createElement(Avatar, {
    name: a.cliente,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)',
      textDecoration: a.status === 'cancelado' ? 'line-through' : 'none'
    }
  }, a.cliente), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, a.servico)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      color: 'var(--text-body)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, a.valor), /*#__PURE__*/React.createElement(Badge, {
    tone: TOM[a.status],
    size: "sm",
    dot: a.status === 'confirmado'
  }, ROTULO[a.status]));
}
function Inicio({
  go
}) {
  const d = window.MS_DATA;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 14
    }
  }, d.stats.map(s => /*#__PURE__*/React.createElement(StatCard, {
    key: s.label,
    label: s.label,
    value: s.value,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: s.icon,
      size: 18
    }),
    delta: s.delta,
    deltaDirection: s.dir,
    footnote: s.foot
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 14,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h3)'
    }
  }, "Hoje, 27 de julho"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "6 atendimentos \xB7 3 hor\xE1rios vagos")), /*#__PURE__*/React.createElement(Button, {
    variant: "soft",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    }),
    onClick: () => go('agenda')
  }, "Novo")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, d.agenda.map(a => /*#__PURE__*/React.createElement(LinhaAgenda, {
    key: a.hora,
    a: a
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h3)',
      marginBottom: 12
    }
  }, "O que a maisa fez hoje"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13
    }
  }, [['chat-bubble-oval-left-ellipsis', '31 mensagens respondidas', 'sem passar pra você'], ['calendar-days', '4 horários marcados', 'e 1 reagendado sozinho'], ['document-text', '3 notas emitidas', 'logo depois do pagamento'], ['bell', '9 lembretes enviados', '24h antes de cada atendimento']].map(([ic, t, s]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: 'var(--brand-soft)',
      color: 'var(--brand-text)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 17
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, s)))))), /*#__PURE__*/React.createElement(Card, {
    variant: "inverse",
    pad: "md"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 22,
    color: "var(--green-300)"
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      color: 'var(--cream-50)',
      marginTop: 10
    }
  }, "Uma coisa precisa de voc\xEA"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--green-200)',
      lineHeight: 1.55,
      marginTop: 6
    }
  }, "A nota do Caio Ferraz n\xE3o saiu \u2014 o CPF tem um d\xEDgito a mais. \xC9 r\xE1pido de arrumar."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "sm",
    onClick: () => go('notas')
  }, "Arrumar agora"))))));
}
Object.assign(window, {
  Inicio,
  LinhaAgenda,
  TOM,
  ROTULO
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/Inicio.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/Notas.jsx
try { (() => {
const {
  Card,
  Icon,
  IconButton,
  Badge,
  Button,
  Tabs,
  Tooltip,
  Select
} = window.MaisaDesignSystem_00adcb;
const TOM_NF = {
  emitida: 'success',
  processando: 'info',
  erro: 'danger',
  cancelada: 'neutral'
};
const ROT_NF = {
  emitida: 'Emitida',
  processando: 'Processando',
  erro: 'Não saiu',
  cancelada: 'Cancelada'
};
function Notas({
  onEmitir
}) {
  const d = window.MS_DATA;
  const [aba, setAba] = React.useState('todas');
  const lista = aba === 'todas' ? d.notas : d.notas.filter(n => n.status === aba);
  const th = {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 'var(--tracking-caps)',
    textTransform: 'uppercase',
    color: 'var(--text-subtle)',
    borderBottom: '1px solid var(--border-subtle)'
  };
  const td = {
    padding: '13px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    fontSize: 14,
    color: 'var(--text-body)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "Faturado em julho"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: '-.03em',
      color: 'var(--text-strong)',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 4
    }
  }, "R$ 48.230")), /*#__PURE__*/React.createElement(Card, {
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "Notas emitidas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: '-.03em',
      color: 'var(--text-strong)',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 4
    }
  }, "112")), /*#__PURE__*/React.createElement(Card, {
    variant: "accent",
    pad: "md"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ochre-700)'
    }
  }, "Precisam de voc\xEA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: '-.03em',
      color: 'var(--accent-text)',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 4
    }
  }, "1"))), /*#__PURE__*/React.createElement(Card, {
    pad: "none",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 18px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    variant: "pill",
    value: aba,
    onChange: setAba,
    items: [{
      value: 'todas',
      label: 'Todas'
    }, {
      value: 'emitida',
      label: 'Emitidas'
    }, {
      value: 'processando',
      label: 'Processando'
    }, {
      value: 'erro',
      label: 'Com erro'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    content: "Exportar em CSV"
  }, /*#__PURE__*/React.createElement(IconButton, {
    variant: "outline",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-down-tray",
      size: 18
    }),
    label: "Exportar"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    }),
    onClick: onEmitir
  }, "Emitir nota"))), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "N\xBA"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Cliente"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "CPF / CNPJ"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Servi\xE7o"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "Valor"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Data"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    style: th
  }))), /*#__PURE__*/React.createElement("tbody", null, lista.map((n, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      transition: 'background-color var(--dur-fast) var(--ease-out)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--cream-50)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-strong)'
    }
  }, n.num), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, n.cliente), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, n.doc), /*#__PURE__*/React.createElement("td", {
    style: td
  }, n.servico), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums'
    }
  }, n.valor), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, n.data), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: TOM_NF[n.status],
    size: "sm"
  }, ROT_NF[n.status])), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: 'right'
    }
  }, n.status === 'erro' ? /*#__PURE__*/React.createElement(Button, {
    variant: "soft",
    size: "sm"
  }, "Arrumar") : /*#__PURE__*/React.createElement(IconButton, {
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "ellipsis-horizontal",
      size: 17
    }),
    label: "Op\xE7\xF5es da nota"
  }))))))));
}
Object.assign(window, {
  Notas
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/Notas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/Shell.jsx
try { (() => {
const {
  Logo,
  Icon,
  IconButton,
  Avatar,
  Badge,
  Button
} = window.MaisaDesignSystem_00adcb;
const NAV = [{
  id: 'inicio',
  label: 'Início',
  icon: 'home'
}, {
  id: 'conversas',
  label: 'Conversas',
  icon: 'chat-bubble-left-right',
  count: 2
}, {
  id: 'agenda',
  label: 'Agenda',
  icon: 'calendar-days'
}, {
  id: 'clientes',
  label: 'Clientes',
  icon: 'users'
}, {
  id: 'notas',
  label: 'Notas fiscais',
  icon: 'document-text'
}, {
  id: 'ajustes',
  label: 'Ajustes',
  icon: 'cog-6-tooth'
}];
function Sidebar({
  view,
  setView
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--sidebar-w)',
      flex: '0 0 auto',
      background: 'var(--surface-card)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 8px 22px'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 26
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, NAV.map(n => {
    const on = n.id === view;
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => setView(n.id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 40,
        padding: '0 10px',
        border: 0,
        cursor: 'pointer',
        borderRadius: 'var(--radius-control)',
        background: on ? 'var(--brand-soft)' : 'transparent',
        color: on ? 'var(--brand-text)' : 'var(--text-muted)',
        fontWeight: on ? 600 : 500,
        fontSize: 15,
        transition: 'var(--transition-control)',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 20,
      strokeWidth: on ? 1.9 : 1.6
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, n.label), n.count ? /*#__PURE__*/React.createElement("span", {
      className: "ms-tab__count",
      style: {
        background: on ? 'var(--green-200)' : 'var(--ink-100)'
      }
    }, n.count) : null);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ms-card ms-card--accent ms-card--pad-sm"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 17,
    color: "var(--accent-text)"
  }), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 13,
      color: 'var(--accent-text)'
    }
  }, "maisa est\xE1 no ar")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: 'var(--ochre-700)',
      lineHeight: 1.45
    }
  }, "Respondeu 31 mensagens hoje sem te chamar.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 6px',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Renata Lasca",
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Renata Lasca"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-subtle)'
    }
  }, "Studio Lasca \xB7 Pro")), /*#__PURE__*/React.createElement(IconButton, {
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-up",
      size: 16
    }),
    label: "Conta"
  }))));
}
function Topbar({
  title,
  sub,
  action
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--header-h)',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h3)',
      letterSpacing: 'var(--tracking-tight)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 260
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ms-input__affix ms-input__affix--prefix"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "magnifying-glass",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "ms-input ms-input--sm ms-input--with-prefix",
    placeholder: "Buscar cliente ou nota"
  })), /*#__PURE__*/React.createElement(IconButton, {
    variant: "outline",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "bell",
      size: 19
    }),
    label: "Notifica\xE7\xF5es"
  }), action);
}
Object.assign(window, {
  Sidebar,
  Topbar,
  NAV
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel/data.js
try { (() => {
/* Dados fictícios do painel maisa — nomes e valores de exemplo em pt-BR. */
window.MS_DATA = {
  conta: {
    negocio: 'Studio Lasca',
    dono: 'Renata Lasca',
    plano: 'Pro'
  },
  stats: [{
    label: 'Atendimentos na semana',
    value: '38',
    icon: 'chat-bubble-left-right',
    delta: '12% vs. semana passada',
    dir: 'up',
    foot: 'sem ninguém digitar'
  }, {
    label: 'Faturamento',
    value: 'R$ 12.480',
    icon: 'banknotes',
    delta: '8% vs. semana passada',
    dir: 'up'
  }, {
    label: 'Notas emitidas',
    value: '26',
    icon: 'document-text',
    foot: 'nenhuma pendente'
  }, {
    label: 'Horários vagos hoje',
    value: '3',
    icon: 'clock',
    foot: '14h, 16h30 e 18h'
  }],
  agenda: [{
    hora: '09:00',
    dur: '45 min',
    cliente: 'Juliana Prado',
    servico: 'Corte + escova',
    status: 'confirmado',
    valor: 'R$ 180'
  }, {
    hora: '10:00',
    dur: '30 min',
    cliente: 'Marcos Aurélio',
    servico: 'Barba',
    status: 'confirmado',
    valor: 'R$ 70'
  }, {
    hora: '11:30',
    dur: '1h30',
    cliente: 'Beatriz Nunes',
    servico: 'Coloração',
    status: 'aguardando',
    valor: 'R$ 420'
  }, {
    hora: '13:00',
    dur: '45 min',
    cliente: 'Caio Ferraz',
    servico: 'Corte masculino',
    status: 'confirmado',
    valor: 'R$ 90'
  }, {
    hora: '15:00',
    dur: '1h',
    cliente: 'Sandra Vitório',
    servico: 'Hidratação',
    status: 'cancelado',
    valor: 'R$ 150'
  }, {
    hora: '17:00',
    dur: '45 min',
    cliente: 'Pedro Lemos',
    servico: 'Corte + barba',
    status: 'confirmado',
    valor: 'R$ 140'
  }],
  conversas: [{
    id: 1,
    nome: 'Juliana Prado',
    tel: '11 91234-5678',
    ultima: '9h fica ótimo',
    hora: '14:33',
    naoLidas: 0,
    porMaisa: true,
    tags: ['Cliente VIP']
  }, {
    id: 2,
    nome: 'Marcos Aurélio',
    tel: '11 98877-1200',
    ultima: 'Consigo chegar 10 minutos atrasado?',
    hora: '14:12',
    naoLidas: 2,
    porMaisa: false,
    tags: []
  }, {
    id: 3,
    nome: 'Beatriz Nunes',
    tel: '11 99610-4477',
    ultima: 'A maisa mandou o orçamento da coloração',
    hora: '13:40',
    naoLidas: 0,
    porMaisa: true,
    tags: ['Orçamento']
  }, {
    id: 4,
    nome: 'Caio Ferraz',
    tel: '11 94422-8899',
    ultima: 'Obrigado! Até amanhã',
    hora: '11:02',
    naoLidas: 0,
    porMaisa: true,
    tags: []
  }, {
    id: 5,
    nome: 'Sandra Vitório',
    tel: '11 97010-3355',
    ultima: 'Preciso cancelar, surgiu um imprevisto',
    hora: 'Ontem',
    naoLidas: 0,
    porMaisa: true,
    tags: []
  }],
  thread: {
    1: [{
      from: 'in',
      t: '14:31',
      txt: 'Oi! Tem horário amanhã de manhã?'
    }, {
      from: 'out',
      a: 'maisa',
      t: '14:31',
      s: 'read',
      txt: 'Oi, Juliana! Tenho sim. 9h ou 10h30, qual fica melhor?'
    }, {
      from: 'in',
      t: '14:33',
      txt: '9h fica ótimo'
    }, {
      from: 'out',
      a: 'maisa',
      t: '14:33',
      s: 'read',
      txt: 'Fechado. Corte + escova, quinta às 9h, com a Renata. Te lembro na véspera.'
    }, {
      from: 'note',
      txt: 'Agendamento criado · quinta, 9h · Corte + escova · R$ 180'
    }, {
      from: 'in',
      t: '14:35',
      txt: 'Perfeito, obrigada!'
    }],
    2: [{
      from: 'in',
      t: '14:10',
      txt: 'Bom dia'
    }, {
      from: 'in',
      t: '14:12',
      txt: 'Consigo chegar 10 minutos atrasado?'
    }, {
      from: 'note',
      txt: 'A maisa passou pra você — pedido de mudança em cima da hora'
    }]
  },
  notas: [{
    num: '1.284',
    cliente: 'Juliana Prado',
    doc: '312.887.440-11',
    servico: 'Corte + escova',
    valor: 'R$ 180,00',
    data: '27/07/2026',
    status: 'emitida'
  }, {
    num: '1.283',
    cliente: 'Marcos Aurélio',
    doc: '109.552.887-03',
    servico: 'Barba',
    valor: 'R$ 70,00',
    data: '27/07/2026',
    status: 'emitida'
  }, {
    num: '1.282',
    cliente: 'Studio Bela Ltda',
    doc: '18.774.220/0001-45',
    servico: 'Coloração',
    valor: 'R$ 420,00',
    data: '26/07/2026',
    status: 'processando'
  }, {
    num: '—',
    cliente: 'Caio Ferraz',
    doc: '448.120.775-90',
    servico: 'Corte masculino',
    valor: 'R$ 90,00',
    data: '26/07/2026',
    status: 'erro'
  }, {
    num: '1.281',
    cliente: 'Pedro Lemos',
    doc: '221.640.339-71',
    servico: 'Corte + barba',
    valor: 'R$ 140,00',
    data: '25/07/2026',
    status: 'emitida'
  }, {
    num: '1.280',
    cliente: 'Sandra Vitório',
    doc: '905.331.208-64',
    servico: 'Hidratação',
    valor: 'R$ 150,00',
    data: '24/07/2026',
    status: 'cancelada'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel/data.js", error: String((e && e.message) || e) }); }

// ui_kits/site/Header.jsx
try { (() => {
const {
  Logo,
  Button,
  Icon,
  IconButton
} = window.MaisaDesignSystem_00adcb;
function Header() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(247,242,233,.82)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter)',
      height: 72,
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 26
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 26,
      flex: 1
    }
  }, ['Como funciona', 'Preços', 'Para quem é', 'Ajuda'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-body)',
      textDecoration: 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-body)',
      textDecoration: 'none'
    }
  }, "Entrar"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    })
  }, "Testar 14 dias")));
}
Object.assign(window, {
  Header
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Hero.jsx
try { (() => {
const {
  Button,
  Icon,
  Badge,
  ChatBubble,
  Logo
} = window.MaisaDesignSystem_00adcb;
function Telefone() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 322,
      borderRadius: 38,
      background: 'var(--ink-900)',
      padding: 9,
      boxShadow: 'var(--shadow-lg)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 30,
      background: 'var(--surface-sunken)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--green-800)',
      padding: '14px 16px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 20,
    color: "var(--cream-50)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'var(--green-600)',
      color: 'var(--cream-50)',
      fontSize: 13,
      fontWeight: 600
    }
  }, "SL"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--cream-50)'
    }
  }, "Studio Lasca"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--green-300)'
    }
  }, "online"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 12px 10px',
      minHeight: 388
    }
  }, /*#__PURE__*/React.createElement(ChatBubble, {
    from: "in",
    time: "14:31"
  }, "Oi! Tem hor\xE1rio amanh\xE3 de manh\xE3?"), /*#__PURE__*/React.createElement(ChatBubble, {
    from: "out",
    time: "14:31",
    status: "read"
  }, "Oi, Juliana! Tenho sim. 9h ou 10h30, qual fica melhor?"), /*#__PURE__*/React.createElement(ChatBubble, {
    from: "in",
    time: "14:33"
  }, "9h fica \xF3timo"), /*#__PURE__*/React.createElement(ChatBubble, {
    from: "out",
    time: "14:33",
    status: "read"
  }, "Fechado. Corte + escova, quinta \xE0s 9h. Te lembro na v\xE9spera."), /*#__PURE__*/React.createElement(ChatBubble, {
    from: "note"
  }, "Agendamento criado \xB7 quinta, 9h")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px 14px',
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 38,
      borderRadius: 999,
      background: 'var(--surface-card)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      fontSize: 13,
      color: 'var(--text-subtle)'
    }
  }, "Mensagem"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: 'var(--brand)',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "paper-airplane",
    size: 18
  })))));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '80px var(--gutter) 72px',
      display: 'grid',
      gridTemplateColumns: '1.15fr auto',
      gap: 64,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "ms-badge ms-badge--subtle ms-badge--brand ms-badge--md",
    style: {
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 14
  }), " Funciona no WhatsApp que voc\xEA j\xE1 tem"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      letterSpacing: 'var(--tracking-display)',
      fontSize: 68
    }
  }, "Sua secret\xE1ria", /*#__PURE__*/React.createElement("br", null), "que nunca dorme"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      fontSize: 20,
      color: 'var(--text-muted)',
      maxWidth: '38ch',
      marginTop: 22
    }
  }, "A maisa atende seus clientes no WhatsApp, marca o hor\xE1rio na sua agenda e emite a nota fiscal. Voc\xEA s\xF3 aparece quando o cliente chega."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 32,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 19
    })
  }, "Testar 14 dias de gra\xE7a"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "Ver como funciona")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 22,
      marginTop: 26,
      flexWrap: 'wrap'
    }
  }, ['Sem cartão', 'Configura em 10 minutos', 'Cancela quando quiser'].map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontSize: 14,
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    variant: "solid",
    size: 17,
    color: "var(--brand)"
  }), t)))), /*#__PURE__*/React.createElement(Telefone, null));
}
Object.assign(window, {
  Hero,
  Telefone
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Precos.jsx
try { (() => {
const {
  Card,
  Icon,
  Button,
  Badge
} = window.MaisaDesignSystem_00adcb;
const PLANOS = [{
  nome: 'Solo',
  preco: '79',
  desc: 'Pra quem atende sozinho.',
  itens: ['1 número de WhatsApp', 'Agenda e lembretes', 'Até 300 conversas por mês', 'Suporte por WhatsApp'],
  cta: 'Começar',
  destaque: false
}, {
  nome: 'Pro',
  preco: '149',
  desc: 'O mais escolhido por salões e clínicas.',
  itens: ['Tudo do Solo', 'NF-e automática', 'Conversas ilimitadas', 'Até 5 profissionais na agenda', 'Relatório mensal'],
  cta: 'Testar 14 dias',
  destaque: true
}, {
  nome: 'Equipe',
  preco: '289',
  desc: 'Vários profissionais, uma maisa só.',
  itens: ['Tudo do Pro', 'Profissionais ilimitados', '2 números de WhatsApp', 'Integração com seu sistema'],
  cta: 'Falar com a gente',
  destaque: false
}];
function Precos() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: 'var(--section-y) var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h1)',
      fontSize: 44,
      letterSpacing: 'var(--tracking-display)'
    }
  }, "Pre\xE7o de secret\xE1ria? N\xE3o."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      fontSize: 18,
      color: 'var(--text-muted)',
      marginTop: 12
    }
  }, "Sem taxa de instala\xE7\xE3o, sem fidelidade. Cancela pelo pr\xF3prio WhatsApp.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 20,
      marginTop: 48,
      alignItems: 'start'
    }
  }, PLANOS.map(p => /*#__PURE__*/React.createElement(Card, {
    key: p.nome,
    pad: "lg",
    variant: p.destaque ? 'raised' : 'default',
    style: p.destaque ? {
      outline: '2px solid var(--brand)',
      outlineOffset: -2
    } : undefined
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      fontSize: 20
    }
  }, p.nome), p.destaque && /*#__PURE__*/React.createElement(Badge, {
    tone: "brand",
    variant: "solid",
    size: "sm"
  }, "Mais escolhido")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 4,
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      color: 'var(--text-muted)',
      fontWeight: 500
    }
  }, "R$"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 52,
      fontWeight: 700,
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-strong)'
    }
  }, p.preco), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: 'var(--text-muted)'
    }
  }, "/m\xEAs")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: p.destaque ? 'primary' : 'secondary',
    size: "md",
    block: true
  }, p.cta)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      marginTop: 24,
      paddingTop: 20,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, p.itens.map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'flex',
      gap: 9,
      alignItems: 'flex-start',
      fontSize: 14.5,
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "var(--brand)",
    strokeWidth: 2.1
  }), i)))))));
}
const PERGUNTAS = [['Preciso trocar meu número?', 'Não. A maisa entra no número que seus clientes já têm salvo — é uma conexão oficial com o WhatsApp Business.'], ['E se eu quiser responder eu mesmo?', 'É só digitar. Assim que você escreve na conversa, a maisa sai de cena e só volta quando você mandar.'], ['A nota fiscal funciona na minha cidade?', 'Hoje emitimos em 780 municípios. A gente confirma a sua na hora do cadastro, antes de você pagar qualquer coisa.'], ['O cliente percebe que é um robô?', 'A maisa se apresenta como assistente do seu negócio. Nada de fingir que é você.']];
function Perguntas() {
  const [aberta, setAberta] = React.useState(0);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-narrow)',
      margin: '0 auto',
      padding: '0 var(--gutter) var(--section-y)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h1)',
      fontSize: 38,
      letterSpacing: 'var(--tracking-display)',
      marginBottom: 28
    }
  }, "Perguntas que sempre chegam"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, PERGUNTAS.map(([q, a], i) => {
    const on = i === aberta;
    return /*#__PURE__*/React.createElement("div", {
      key: q,
      className: "ms-card ms-card--pad-none",
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setAberta(on ? -1 : i),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '18px 22px',
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 17,
        fontWeight: 600,
        color: 'var(--text-strong)'
      }
    }, q), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        transform: on ? 'rotate(180deg)' : 'none',
        transition: 'transform var(--dur-base) var(--ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-down",
      size: 20
    }))), on && /*#__PURE__*/React.createElement("p", {
      style: {
        padding: '0 22px 20px',
        fontSize: 15.5,
        color: 'var(--text-muted)',
        lineHeight: 1.65,
        maxWidth: '62ch'
      }
    }, a));
  })));
}
Object.assign(window, {
  Precos,
  Perguntas
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Precos.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Rodape.jsx
try { (() => {
const {
  Logo,
  Button,
  Icon
} = window.MaisaDesignSystem_00adcb;
function Chamada() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter) var(--section-y)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--brand)',
      borderRadius: 'var(--radius-2xl)',
      padding: '64px 56px',
      display: 'flex',
      alignItems: 'center',
      gap: 48,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 420px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h1)',
      fontSize: 44,
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--white)'
    }
  }, "Deixa a maisa atender hoje \xE0 tarde"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: 'var(--green-100)',
      marginTop: 14,
      maxWidth: '44ch'
    }
  }, "Quatorze dias de gra\xE7a, sem cart\xE3o. Se n\xE3o gostar, \xE9 s\xF3 desconectar.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 19
    })
  }, "Testar de gra\xE7a"), /*#__PURE__*/React.createElement(Button, {
    variant: "soft",
    size: "lg"
  }, "Falar com a gente"))));
}
function Rodape() {
  const cols = [['Produto', ['Como funciona', 'Preços', 'Nota fiscal', 'Agenda', 'Novidades']], ['Para quem é', ['Salões e barbearias', 'Clínicas', 'Estúdios', 'Oficinas', 'Petshops']], ['A gente', ['Sobre a maisa', 'Blog', 'Trabalhe com a gente', 'Contato']], ['Jurídico', ['Termos de uso', 'Privacidade', 'LGPD', 'Status']]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '56px var(--gutter) 32px',
      display: 'grid',
      gridTemplateColumns: '1.4fr repeat(4,1fr)',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    size: 24
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)',
      marginTop: 12,
      maxWidth: '28ch',
      lineHeight: 1.6
    }
  }, "A secret\xE1ria de IA que atende no WhatsApp, marca hor\xE1rio e emite nota fiscal.")), cols.map(([t, links]) => /*#__PURE__*/React.createElement("div", {
    key: t
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 'var(--tracking-caps)',
      textTransform: 'uppercase',
      color: 'var(--text-subtle)',
      marginBottom: 14
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: 14.5,
      color: 'var(--text-body)',
      textDecoration: 'none'
    }
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '20px var(--gutter) 40px',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      gap: 20,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-subtle)'
    }
  }, "\xA9 2026 maisa tecnologia ltda \xB7 CNPJ 41.882.330/0001-07"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-subtle)',
      marginLeft: 'auto'
    }
  }, "Feito em S\xE3o Paulo")));
}
Object.assign(window, {
  Chamada,
  Rodape
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Rodape.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Secoes.jsx
try { (() => {
const {
  Card,
  Icon,
  Button,
  Badge,
  Avatar
} = window.MaisaDesignSystem_00adcb;
function Faixa() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '22px var(--gutter)',
      display: 'flex',
      alignItems: 'center',
      gap: 40,
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-subtle)'
    }
  }, "J\xE1 atende em"), ['salões', 'clínicas', 'estúdios de tatuagem', 'consultórios', 'oficinas', 'petshops'].map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 19,
      fontWeight: 600,
      color: 'var(--ink-300)',
      letterSpacing: '-.02em'
    }
  }, t))));
}
function Passos() {
  const passos = [{
    ic: 'link',
    t: 'Conecta o WhatsApp',
    d: 'O mesmo número que seus clientes já salvaram. Leva uns dez minutos e não precisa de técnico.'
  }, {
    ic: 'chat-bubble-left-right',
    t: 'A maisa atende',
    d: 'Responde dúvida de preço, oferece horário, confirma e reagenda. Você acompanha tudo pelo painel.'
  }, {
    ic: 'document-text',
    t: 'A nota sai sozinha',
    d: 'Pagou, a NF-e é emitida e o link vai direto pro WhatsApp do cliente. Sem planilha, sem correria no fim do mês.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: 'var(--section-y) var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h1)',
      fontSize: 44,
      letterSpacing: 'var(--tracking-display)',
      maxWidth: '18ch'
    }
  }, "Tr\xEAs passos e ela j\xE1 est\xE1 trabalhando"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 20,
      marginTop: 44
    }
  }, passos.map((p, i) => /*#__PURE__*/React.createElement(Card, {
    key: p.t,
    pad: "lg"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 46,
      height: 46,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--brand-soft)',
      color: 'var(--brand-text)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: p.ic,
    size: 23
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-subtle)',
      marginTop: 20
    }
  }, "0", i + 1), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      fontSize: 22,
      marginTop: 4
    }
  }, p.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15.5,
      color: 'var(--text-muted)',
      lineHeight: 1.6,
      marginTop: 10
    }
  }, p.d)))));
}
function Recursos() {
  const items = [{
    ic: 'calendar-days',
    t: 'Agenda que se organiza',
    d: 'Ela conhece seus horários, a duração de cada serviço e o intervalo do almoço.'
  }, {
    ic: 'banknotes',
    t: 'Cobrança e Pix',
    d: 'Manda o link de pagamento e avisa quando cai.'
  }, {
    ic: 'receipt-percent',
    t: 'NF-e automática',
    d: 'Emite pela sua prefeitura e guarda tudo organizado por mês.'
  }, {
    ic: 'bell',
    t: 'Lembrete na véspera',
    d: 'Menos falta, menos horário vago.'
  }, {
    ic: 'users',
    t: 'Ficha do cliente',
    d: 'Histórico, preferências e o que ele já gastou, sempre à mão.'
  }, {
    ic: 'shield-check',
    t: 'Você no controle',
    d: 'Entrou na conversa? A maisa sai de cena na hora.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-inverse)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: 'var(--section-y) var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h1)',
      fontSize: 44,
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--cream-50)',
      maxWidth: '20ch'
    }
  }, "O trabalho chato, feito enquanto voc\xEA atende"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 32,
      marginTop: 48
    }
  }, items.map(it => /*#__PURE__*/React.createElement("div", {
    key: it.t
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.ic,
    size: 24,
    color: "var(--green-300)"
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      fontSize: 19,
      color: 'var(--cream-50)',
      marginTop: 14
    }
  }, it.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      color: 'var(--green-200)',
      lineHeight: 1.6,
      marginTop: 6
    }
  }, it.d))))));
}
function Depoimento() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-narrow)',
      margin: '0 auto',
      padding: 'var(--section-y) var(--gutter)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: 'var(--tracking-tight)',
      lineHeight: 1.32,
      color: 'var(--text-strong)'
    }
  }, "\u201CEu perdia uma hora por dia respondendo \u2018tem hor\xE1rio?\u2019. Agora a maisa responde e eu s\xF3 olho a agenda de manh\xE3.\u201D"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Renata Lasca",
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, "Renata Lasca"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)'
    }
  }, "Studio Lasca \xB7 S\xE3o Paulo"))));
}
Object.assign(window, {
  Faixa,
  Passos,
  Recursos,
  Depoimento
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Secoes.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ChatBubble = __ds_scope.ChatBubble;

__ds_ns.StatCard = __ds_scope.StatCard;

})();
