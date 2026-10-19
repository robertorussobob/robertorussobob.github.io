/*! © 2026 Roberto Russo. Tutti i diritti riservati. */
import{S as e}from"./vista-tridimensionale-D5BDWjAU.js";import{h as n}from"./helperFunctions-84OK4o40.js";import"./index-B7aLmf9h.js";import"./glosse-in-vista-DvPxlfIT.js";const o="rgbdDecodePixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;e.ShadersStore[o]||(e.ShadersStore[o]=t);const a=[n];for(const r of a)e.IncludesShadersStore[r.name]||(e.IncludesShadersStore[r.name]=r.shader);const c={name:o,shader:t};export{c as rgbdDecodePixelShader};
