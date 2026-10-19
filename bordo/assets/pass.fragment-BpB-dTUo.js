/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as r}from"./vista-tridimensionale-BZm19-tj.js";import"./index-CyGS22rv.js";import"./glosse-in-vista-CKielg6q.js";const e="passPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);}`;r.ShadersStore[e]||(r.ShadersStore[e]=a);const i={name:e,shader:a};export{i as passPixelShader};
