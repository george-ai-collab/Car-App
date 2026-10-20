import { useEffect } from "react";
import { Car, User, MapPin, Heart, MessageCircle, Bell } from "lucide-react";
import { T } from "../theme";
import { timeAgo, notifText } from "../lib/utils";
import { Avatar, EmptyState } from "../components/ui";

export function notifIcon(type) {
  if (type === "like") return <Heart size={16} color={T.accent} fill={T.accent} />;
  if (type === "comment") return <MessageCircle size={16} color={T.accent2} />;
  if (type === "reply") return <MessageCircle size={16} color={T.accent2} />;
  if (type === "follow") return <User size={16} color={T.accent} />;
  if (type === "spot") return <MapPin size={16} color={T.accent2} />;
  if (type === "followBuild") return <Car size={16} color={T.accent} />;
  if (type === "threadReply") return <MessageCircle size={16} color={T.accent2} />;
  return null;
}

export function InboxView({ me, notifications, posts, cars, discussions = {}, onMount, openPost, openCar, openProfile, openThread }) {
  useEffect(() => { onMount(); }, []);
  const list = [...notifications].sort((a, b) => new Date(b.date) - new Date(a.date));

  const go = (n) => {
    if ((n.type === "like" || n.type === "comment" || n.type === "reply") && posts[n.postId]) openPost(n.postId);
    else if ((n.type === "spot" || n.type === "followBuild") && cars[n.carId]) openCar(n.carId);
    else if (n.type === "follow") openProfile(n.from);
    else if (n.type === "threadReply" && discussions[n.threadId] && openThread) openThread(n.threadId);
  };

  return (
    <div style={{ paddingTop: 18 }}>
      <div className="display" style={{ fontSize: 22, color: T.text, marginBottom: 14 }}>Notifications</div>
      {list.length === 0 ? (
        <EmptyState icon={<Bell size={20} color={T.textDim} />} title="Nothing yet" body="When other people like, comment, follow or spot your car, it shows up here. Your own likes and comments don't." />
      ) : (
        list.map((n) => (
          <button key={n.id} onClick={() => go(n)} style={{
            width: "100%", background: "none", border: "none", padding: "12px 0",
            display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.lineDark}`, textAlign: "left",
          }}>
            <Avatar username={n.from} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700 }}>{n.from}</span> {notifText(n)}
              </div>
              <div style={{ color: T.textDim, fontSize: 11.5, marginTop: 2 }}>{timeAgo(n.date)}</div>
            </div>
            {notifIcon(n.type)}
            {!n.read && <div style={{ width: 7, height: 7, borderRadius: 99, background: T.accent, flexShrink: 0 }} />}
          </button>
        ))
      )}
    </div>
  );
}
