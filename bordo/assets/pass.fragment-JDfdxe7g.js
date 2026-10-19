/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as r}from"./vista-tridimensionale-Kf8O-pFX.js";import"./index-UcmpT7Ow.js";import"./glosse-in-vista-CHE23yRA.js";const e="passPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);}`;r.ShadersStore[e]||(r.ShadersStore[e]=a);const i={name:e,shader:a};export{i as passPixelShader};
