/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as r}from"./vista-tridimensionale-D5BDWjAU.js";import"./index-B7aLmf9h.js";import"./glosse-in-vista-DvPxlfIT.js";const a="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;r.IncludesShadersStore[a]||(r.IncludesShadersStore[a]=o);const d={name:a,shader:o};export{d as shadowMapFragmentSoftTransparentShadow};
