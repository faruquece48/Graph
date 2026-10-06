import { writeFile } from "node:fs/promises";

const directoryUrl = "https://www.eee.ruet.ac.bd/teacher";
const decode = value => value
  .replace(/<[^>]*>/g," ")
  .replace(/&amp;/g,"&").replace(/&nbsp;/g," ")
  .replace(/&#039;/g,"'").replace(/&quot;/g,'"')
  .replace(/\s+/g," ").trim();

const directory = await (await fetch(directoryUrl)).text();
const active = directory.split(/Retired Faculty/i)[0];
const cardPattern = /<h3 class="title"><a href="([^"]+)">([\s\S]*?)<\/a><\/h3>\s*<span class="post second_color">([\s\S]*?)<\/span>(?:\s*<span class="dept">([\s\S]*?)<\/span>)?/g;
const profiles = new Map();
for (const match of active.matchAll(cardPattern)) {
  const url=decode(match[1]);
  const record={name:decode(match[2]),designation:decode(match[3]),department:decode(match[4] || "Electrical & Electronic Engineering"),profileUrl:url};
  if (!profiles.has(url) || profiles.get(url).designation === "Head") profiles.set(url,record);
}
const entries=[...profiles.values()];
const rows=[];
for (let offset=0;offset<entries.length;offset+=10) {
  const batch=entries.slice(offset,offset+10);
  const values=await Promise.all(batch.map(async record => {
    try {
      const html=await (await fetch(record.profileUrl)).text();
      const bengali=html.match(/<h6 class="professor_name pl-3">([\s\S]*?)<\/h6>/i);
      const plain=decode(html);
      const email=plain.match(/Email:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
      return {...record,nameBangla:bengali ? decode(bengali[1]) : "",accountNo:"",email:email ? email[1] : ""};
    } catch {
      return {...record,nameBangla:"",accountNo:"",email:""};
    }
  }));
  rows.push(...values);
}
await writeFile("app/teacher-data.json",JSON.stringify(rows,null,2)+"\n","utf8");
console.log(JSON.stringify({count:rows.length,missingBangla:rows.filter(r=>!r.nameBangla).map(r=>r.name),missingEmail:rows.filter(r=>!r.email).map(r=>r.name)},null,2));
