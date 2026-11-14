'use client';
import {useEffect,useRef} from 'react';
import maplibregl, {Map as MapGL, Marker} from 'maplibre-gl';
export function FarmMap({latitude,longitude,onPick}:{latitude:number;longitude:number;onPick:(lat:number,lng:number)=>void}){
 const div=useRef<HTMLDivElement>(null);const map=useRef<MapGL|null>(null);const marker=useRef<Marker|null>(null);const onPickRef=useRef(onPick);
 useEffect(()=>{onPickRef.current=onPick},[onPick]);
 useEffect(()=>{if(!div.current||map.current)return;const m=new maplibregl.Map({container:div.current,style:'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',center:[longitude,latitude],zoom:9,attributionControl:{}});m.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');m.on('click',e=>onPickRef.current(Number(e.lngLat.lat.toFixed(5)),Number(e.lngLat.lng.toFixed(5))));map.current=m;return()=>{marker.current?.remove();map.current=null;m.remove()}},[]);
 useEffect(()=>{if(!map.current)return;if(!marker.current){marker.current=new maplibregl.Marker({color:'#166a4c'}).setLngLat([longitude,latitude]).addTo(map.current)}else{marker.current.setLngLat([longitude,latitude])}map.current.easeTo({center:[longitude,latitude],duration:550})},[latitude,longitude]);
 return <div ref={div} className="h-[290px] lg:h-[410px] w-full rounded-2xl overflow-hidden border border-green-100" aria-label="Mapa interactivo: haz clic para elegir coordenadas"/>;
}
