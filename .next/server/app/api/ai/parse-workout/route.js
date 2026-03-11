"use strict";(()=>{var e={};e.id=445,e.ids=[445],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},83034:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>j,patchFetch:()=>_,requestAsyncStorage:()=>y,routeModule:()=>x,serverHooks:()=>w,staticGenerationAsyncStorage:()=>f});var s={};r.r(s),r.d(s,{POST:()=>g});var a=r(49303),o=r(88716),n=r(60670),i=r(87070),u=r(51472),l=r(26729),c=r(97453),p=r(9071),d=r(35860);let m=["chest","back","shoulders","biceps","triceps","legs","quads","hamstrings","glutes","calves","core","forearms","traps","lats","full_body"];async function h(e){let t=process.env.GROQ_API_KEY;if(!t)return null;try{let r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:"system",content:"You are an expert personal trainer and workout program analyst. You ONLY respond with valid JSON. No markdown, no explanations."},{role:"user",content:e}],temperature:.1,max_tokens:4096,response_format:{type:"json_object"}})});if(!r.ok)return null;let s=await r.json();return s?.choices?.[0]?.message?.content??null}catch{return null}}async function g(e){let t;let r=await (0,u.Z1)();if(!r)return i.NextResponse.json({error:"Unauthorized"},{status:401});let s=(0,u.jq)(),{data:a}=await s.from("profiles").select("plan").eq("id",r.user.id).single(),o=a?.plan??"free",n=(0,p.iX)(o,"ai_parses_per_day"),g=(0,d.D)(`parse-workout:${r.user.id}`,n);if(!g.allowed){let e=Math.ceil((g.resetAt-Date.now())/36e5);return i.NextResponse.json({error:`Daily AI limit reached (${n}/day on free plan). Resets in ~${e}h. Upgrade to Pro for unlimited.`},{status:429,headers:{"X-RateLimit-Limit":String(n),"X-RateLimit-Remaining":"0","X-RateLimit-Reset":String(Math.floor(g.resetAt/1e3)),"Retry-After":String(3600*e)}})}try{t=await e.json()}catch{return i.NextResponse.json({error:"Invalid JSON body"},{status:400})}let x=(0,c.oO)(t.text);if(!x||x.length<10)return i.NextResponse.json({error:"Workout text is too short"},{status:400});let y=(0,l.VQ)(x),f=0===y.days.flatMap(e=>e.exercises).length?"low":y.days.length>=2?"high":"medium";if("high"===f&&y.days.length>=2)return i.NextResponse.json({data:y,source:"local",confidence:"high"});let w=`Parse this gym workout program into structured JSON.

Text:
"""
${x}
"""

Return a JSON object with this exact structure:
{
  "days": [
    {
      "day_name": "Monday",
      "focus": "Chest + Triceps",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "8-10",
          "muscle_group": "chest"
        }
      ]
    }
  ]
}

Rules:
- muscle_group must be exactly one of: chest, back, shoulders, biceps, triceps, legs, quads, hamstrings, glutes, calves, core, forearms, traps, lats, full_body
- sets must be a number (1-10)
- reps can be a range "8-12" or single number "10"
- day_name should preserve the original name (Monday, Push Day, etc.)
- Extract ALL days and exercises from the text
- Maximum 14 days, maximum 20 exercises per day`,j=await h(w);if(j){var _;let e=(_=(0,l.Ws)(j),(0,c.xk)(_)?{days:_.days.map(e=>{let t=Array.isArray(e.exercises)?e.exercises:[];return{day_name:String(e.day_name??"").slice(0,50),focus:e.focus?String(e.focus).slice(0,100):void 0,exercises:t.slice(0,20).map(e=>{var t;let r=String(e.name??"").slice(0,80);return{name:r,sets:Math.min(10,Math.max(1,Number(e.sets)||3)),reps:String(e.reps??"10").slice(0,10),muscle_group:e.muscle_group?"string"==typeof(t=e.muscle_group)&&m.includes(t)?t:"full_body":(0,l.S)(r)}})}}).filter(e=>e.day_name&&e.exercises.length>0)}:null);if(e&&e.days.length>0)return i.NextResponse.json({data:e,source:"groq",confidence:e.days.length>=2?"high":"medium"})}return i.NextResponse.json({data:y,source:"local",confidence:f})}let x=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/ai/parse-workout/route",pathname:"/api/ai/parse-workout",filename:"route",bundlePath:"app/api/ai/parse-workout/route"},resolvedPagePath:"D:\\Projects\\Projects\\fitness-pwa\\app\\api\\ai\\parse-workout\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:y,staticGenerationAsyncStorage:f,serverHooks:w}=x,j="/api/ai/parse-workout/route";function _(){return(0,n.patchFetch)({serverHooks:w,staticGenerationAsyncStorage:f})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[276,323,875],()=>r(83034));module.exports=s})();