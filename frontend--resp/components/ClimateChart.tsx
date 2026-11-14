'use client';
import {ResponsiveContainer,BarChart,Bar,Line,CartesianGrid,XAxis,YAxis,Tooltip,Legend,ComposedChart} from 'recharts';
import type {Monthly} from '@/lib/api';
const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export function ClimateChart({monthly}:{monthly:Monthly[]}){
 const data=monthly.map(m=>({...m,label:months[m.month-1]}));
 return <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{top:15,right:10,left:-16,bottom:5}}><CartesianGrid stroke="#e9f0ea" strokeDasharray="3 3"/><XAxis dataKey="label" tick={{fontSize:11}}/><YAxis yAxisId="rain" tick={{fontSize:11}} unit=""/><YAxis yAxisId="temp" orientation="right" tick={{fontSize:11}}/><Tooltip formatter={(value,name)=>[`${value??'N/D'} ${name==='Lluvia'?'mm':'°C'}`,name]}/><Legend/><Bar yAxisId="rain" dataKey="precipitation_mm" name="Lluvia" fill="#26976b" radius={[4,4,0,0]}/><Line yAxisId="temp" type="monotone" dataKey="temperature_c" name="Temperatura" stroke="#d69544" strokeWidth={2.6} dot={false}/></ComposedChart></ResponsiveContainer></div>;
}
