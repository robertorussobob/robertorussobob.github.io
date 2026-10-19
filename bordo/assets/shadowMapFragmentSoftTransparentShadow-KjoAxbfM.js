/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as r}from"./vista-tridimensionale-MaWkYlji.js";import"./index-B6TZZ0R5.js";import"./glosse-in-vista-BeHVjXBQ.js";const a="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;r.IncludesShadersStore[a]||(r.IncludesShadersStore[a]=o);const d={name:a,shader:o};export{d as shadowMapFragmentSoftTransparentShadow};
