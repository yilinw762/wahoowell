"use client";

import { useState } from "react";

type Gender = "Male" | "Female" | "Non-binary" | "Prefer not to say";

export default function DataEntryPage() {
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("Prefer not to say");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [goal, setGoal] = useState("Maintain health");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { age, gender, weight, height, goal };
    alert("Submitted dummy profile:\n" + JSON.stringify(payload, null, 2));
  };

  return (
    <>
      <h1 style={{marginTop:0}}>Data Entry</h1>
      <div className="card" style={{maxWidth:700}}>
        <form onSubmit={onSubmit}>
          <div className="row">
            <div className="col-6">
              <label className="label">Age</label>
              <input className="input" type="number" min={0} value={age}
                     onChange={e => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                     placeholder="e.g., 21" />
            </div>
            <div className="col-6">
              <label className="label">Gender</label>
              <select className="select" value={gender} onChange={e => setGender(e.target.value as any)}>
                <option>Male</option>
                <option>Female</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </select>
            </div>

            <div className="col-6">
              <label className="label">Weight (kg)</label>
              <input className="input" type="number" min={0} value={weight}
                     onChange={e => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                     placeholder="e.g., 70" />
            </div>
            <div className="col-6">
              <label className="label">Height (cm)</label>
              <input className="input" type="number" min={0} value={height}
                     onChange={e => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                     placeholder="e.g., 175" />
            </div>

            <div className="col-12">
              <label className="label">Goal</label>
              <input className="input" value={goal} onChange={e => setGoal(e.target.value)}
                     placeholder="Lose weight, build endurance, etc." />
            </div>
          </div>

          <div style={{height:16}} />
          <div style={{display:"flex", gap:12}}>
            <button className="button" type="submit">Save</button>
            <button type="button" className="button ghost" onClick={()=>{
              setAge(""); setGender("Prefer not to say"); setWeight(""); setHeight(""); setGoal("Maintain health");
            }}>Reset</button>
          </div>
        </form>
      </div>
    </>
  );
}
