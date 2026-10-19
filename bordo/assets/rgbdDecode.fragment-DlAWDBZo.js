/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as e}from"./vista-tridimensionale-BZm19-tj.js";import{h as n}from"./helperFunctions-DD83TqF1.js";import"./index-CyGS22rv.js";import"./glosse-in-vista-CKielg6q.js";const o="rgbdDecodePixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;e.ShadersStore[o]||(e.ShadersStore[o]=t);const a=[n];for(const r of a)e.IncludesShadersStore[r.name]||(e.IncludesShadersStore[r.name]=r.shader);const c={name:o,shader:t};export{c as rgbdDecodePixelShader};
