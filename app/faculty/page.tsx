"use client";

import { useRef, useState } from "react";
import initialTeachers from "../teacher-data.json";
import styles from "./faculty.module.css";

type Teacher = {
  id: string;
  name: string;
  nameBangla: string;
  designation: string;
  department: string;
  accountNo: string;
  email: string;
  profileUrl?: string;
};

const designations = ["Head","Professor","Associate Professor","Assistant Professor","Lecturer"];
const makeId = () => "teacher-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const startingRows: Teacher[] = initialTeachers.map((teacher,index) => ({...teacher,id:"source-"+index}));

function validImport(value: unknown): value is Omit<Teacher,"id">[] {
  return Array.isArray(value) && value.every(row => row && typeof row === "object" &&
    ["name","nameBangla","designation","department","accountNo","email"].every(key => typeof (row as Record<string,unknown>)[key] === "string") &&
    ((row as Record<string,unknown>).profileUrl === undefined || typeof (row as Record<string,unknown>).profileUrl === "string"));
}

export default function FacultyPage() {
  const [teachers,setTeachers] = useState<Teacher[]>(startingRows);
  const [message,setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function update(id: string, key: keyof Omit<Teacher,"id"|"profileUrl">, value: string) {
    setTeachers(teachers.map(teacher => teacher.id === id ? {...teacher,[key]:value} : teacher));
  }
  function addRow() {
    setTeachers([...teachers,{id:makeId(),name:"",nameBangla:"",designation:"Lecturer",department:"Electrical & Electronic Engineering",accountNo:"",email:""}]);
    setMessage("");
  }
  function exportJson() {
    const data=teachers.map(teacher => ({name:teacher.name,nameBangla:teacher.nameBangla,designation:teacher.designation,department:teacher.department,accountNo:teacher.accountNo,email:teacher.email,profileUrl:teacher.profileUrl}));
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
    const link=document.createElement("a"); link.href=url; link.download="ruet-eee-teachers.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  async function importJson(file: File) {
    try {
      const value: unknown=JSON.parse(await file.text());
      if (!validImport(value)) throw new Error("Choose a valid teacher JSON export.");
      setTeachers(value.map(row => ({...row,id:makeId()})));
      setMessage("Teacher data imported.");
    } catch(error) { setMessage(error instanceof Error ? error.message : "Could not import this file."); }
  }

  return <div className={styles.page}>
    <section className={styles.tableCard}>
      <div className={styles.toolbar}><div><span className={styles.eyebrow}>Faculty records</span><h1>EEE Department</h1><p>{teachers.length} active faculty members</p></div><div className={styles.actions}><button className={styles.addButton} onClick={addRow}>+ Add Row</button><button onClick={exportJson}>Export JSON</button><button onClick={() => fileInput.current?.click()}>Import JSON</button><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e => {const file=e.target.files?.[0];if(file) void importJson(file);e.target.value="";}}/></div></div>
      {message && <p className={styles.message} role="status">{message}</p>}
      <div className={styles.scroll}>
        <table>
          <thead><tr><th>Sl.</th><th>Teacher Name</th><th>Name )�����)</th><th>Designation</th><th>Department</th><th>Account No.</th><th>Email ID</th><th>Action</th></tr></thead>
          <tbody>{teachers.map((teacher,index) => <tr key={teacher.id}><td className={styles.serial}>{index+1}</td><td><input aria-label={"Teacher "+(index+1)+" name"} value={teacher.name} title={teacher.profileUrl || ""} onChange={e => update(teacher.id,"name",e.target.value)}/></td><td><input lang="bn" aria-label={teacher.name+" Bengali name"} value={teacher.nameBangla} placeholder={teacher.nameBangla ? "" : "Not published"} onChange={e => update(teacher.id,"nameBangla",e.target.value)}/></td><td><select aria-label={teacher.name+" designation"} value={teacher.designation} onChange={e => update(teacher.id,"designation",e.target.value)}>{!designations.includes(teacher.designation) && <option>{teacher.designation}</option>}{designations.map(value => <option key={value}>{value}</option>)}</select></td><td><input aria-label={teacher.name+" department"} value={teacher.department} onChange={e => update(teacher.id,"department",e.target.value)}/></td><td><input aria-label={teacher.name+" account number"} value={teacher.accountNo} placeholder="Not published" onChange={e => update(teacher.id,"accountNo",e.target.value)}/></td><td><input type="email" aria-label={teacher.name+" email"} value={teacher.email} onChange={e => update(teacher.id,"email",e.target.value)}/></td><td><button className={styles.deleteButton} onClick={() => setTeachers(teachers.filter(row => row.id !== teacher.id))}>Delete</button></td></tr>)}</tbody>
        </table>
      </div>
      <div className={styles.source}>Source: <a href="https://www.eee.ruet.ac.bd/teacher" target="_blank" rel="noreferrer">RUET EEE Faculty Members</a>. Account numbers are not published by the source and remain blank for editing.</div>
    </section>
  </div>;
}
