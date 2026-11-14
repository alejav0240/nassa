export type Crop = 'papa'|'quinua'|'haba'|'cebada'|'avena'|'tarwi';
export type FieldInput = {name:string;latitude:number;longitude:number;hectares:number;soil_texture:string;irrigation:boolean;current_crop:Crop;soil_ph:number|null};
export type FieldRecord = FieldInput & {id:number};
export type Monthly = {month:number;precipitation_mm:number|null;temperature_c:number|null;frost_days_per_year:number;heat_days_per_year:number};
export type Climate = {source:string;source_url:string;data_type:string;years:number[];annual_rainfall_mm:number;annual_rainfall_by_year:Record<string,number>;rainfall_variability_pct:number|null;annual_frost_days:number;mean_temperature_c:number;monthly:Monthly[];limitations:string[];query_coordinates:{latitude:number;longitude:number}};
export type Strategy = {id:string;title:string;crops:{id:string;label:string}[];score:number;scores:{water:number;soil:number;income:number};explanation:string;benefits:string[];risks:string[];flagged_for_review:boolean};
export type Analysis = {id:number;field_id:number;priorities:{water:number;soil:number;income:number};climate:Climate;strategies:Strategy[];methodology:{method:string;formula:string;scope:string;limitations:string[];nasa_source:string}};
export async function api<T>(path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(`/api${path}`,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'});
  if(!response.ok){let message=`Error HTTP ${response.status}`;try{const data=await response.json();message=typeof data.detail==='string'?data.detail:JSON.stringify(data.detail)}catch{}throw new Error(message)}
  return response.json();
}
