/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as r}from"./vista-tridimensionale-D5BDWjAU.js";import"./index-B7aLmf9h.js";import"./glosse-in-vista-DvPxlfIT.js";const a="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;r.IncludesShadersStoreWGSL[a]||(r.IncludesShadersStoreWGSL[a]=o);const n={name:a,shader:o};export{n as shadowMapFragmentSoftTransparentShadowWGSL};
