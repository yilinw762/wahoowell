import TopPanel from "@/src/components/TopPanel";
import StepsChart from "@/src/components/StepsChart";
import CommunityFeed from "@/src/components/CommunityFeed";
import SuggestedProfiles from "./profiles/SuggestedProfiles"; 

export default function DashboardPage() {
  return (
    <>
      <h1 style={{marginTop:0}}>Dashboard</h1>
      <TopPanel />

      <div className="row" style={{marginTop:16}}>
        <div className="col-8">
          <div className="card">
            <StepsChart />
          </div>
        </div>
        <div className="col-4">
          <div className="card">
            <h3 style={{marginTop:0}}>Community Feed</h3>
            <hr className="sep" />
            <CommunityFeed />
          </div>
          <SuggestedProfiles />
        </div>
      </div>
    </>
  );
}