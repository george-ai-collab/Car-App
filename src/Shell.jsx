import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { T } from "./theme";
import { useNav } from "./nav/useNav";
import { useKeyboardOffset } from "./lib/keyboard";
import { SheetContext } from "./components/ui";
import { SafetyContext } from "./components/Safety";
import { BottomNav } from "./components/BottomNav";
import { Feed } from "./screens/Feed";
import { InboxView } from "./screens/Inbox";
import { PostDetail } from "./screens/PostDetail";
import { DiscoverView, SearchScreen, CommunitiesScreen, NewsScreen } from "./screens/Discover";
import { CommunityPage, CreateCommunityForm, ThreadPage, NewThreadForm } from "./screens/Communities";
import { AddCarForm, CarPage } from "./screens/Cars";
import { Profile } from "./screens/Profile";
import { AddMeetForm, MeetsScreen, MeetDetail } from "./screens/Meets";
import { AddChoiceScreen, NewPostForm, SpotForm } from "./screens/Add";
import { SettingsScreen, EditProfile, ManageCars, ArchivedPosts } from "./screens/Settings";

const ADD_VIEWS = ["addChoice", "newPost", "quickSpot", "addCar"];

export function Shell({ store, toast }) {
  const { me, cars, posts, users, news, meets, communities, notifications, sightings, discussions, actions: a } = store;
  const nav = useNav();
  const { current: cur, stack, go, back, tab, replace, reset, patch } = nav;
  const p = cur.params || {};
  const [sheets, setSheets] = useState(0);
  const kb = useKeyboardOffset();
  const sheetDelta = useCallback((d) => setSheets((n) => Math.max(0, n + d)), []);

  // Android back button / gesture (see main.jsx). Returns false on the Feed so the app minimizes.
  useEffect(() => {
    window.__carfoolyBack = back;
    return () => { delete window.__carfoolyBack; };
  }, [back]);

  // Each page comes back at the scroll position you left it.
  useLayoutEffect(() => { window.scrollTo(0, cur.scrollY || 0); }, [cur.key]);

  // Which bottom-nav tab is lit: the tab this stack started from.
  const activeTab = ADD_VIEWS.includes(cur.view) ? "add"
    : stack[1]?.root ? (stack[1].view === "profile" ? "profile" : stack[1].view)
    : "feed";

  const onTab = (id) => {
    if (id === "feed") tab("feed");
    else if (id === "discover") tab("discover");
    else if (id === "profile") tab("profile", { username: me });
    else if (id === "add") { if (!ADD_VIEWS.includes(cur.view)) go("addChoice"); }
  };

  const openProfile = (username) => {
    if (cur.view === "profile" && p.username === username) return;
    go("profile", { username });
  };
  // Cars without a public page can only be opened by their owner.
  const openCar = (id) => {
    const car = cars[id];
    if (car && car.hasPage === false && car.ownerUsername !== me) { store.flash("This car doesn't have a public page"); return; }
    go("car", { id });
  };
  const openPost = (id) => go("postDetail", { id });
  const openCommunity = (id) => go("communityPage", { id });
  const openMeet = (id) => go("meet", { id });
  const openThread = (id) => go("thread", { id });

  const unread = (notifications[me] || []).filter((n) => !n.read).length;

  let page = null;
  switch (cur.view) {
    case "feed":
      page = <Feed me={me} cars={cars} posts={posts} users={users} tab={p.feedTab || "foryou"} setTab={(t) => patch({ feedTab: t })}
        openCar={openCar} openProfile={openProfile} toggleLike={a.toggleLike} addComment={a.addComment} addReply={a.addReply}
        openSearch={() => go("search")} openInbox={() => go("inbox")} unreadCount={unread} actions={a} scrollKey={cur.key} onFollow={a.toggleFollow} prefs={store.prefs} />;
      break;
    case "inbox":
      page = <InboxView me={me} notifications={notifications[me] || []} posts={posts} cars={cars} discussions={discussions}
        onMount={a.markNotificationsRead} openPost={openPost} openCar={openCar} openProfile={openProfile} openThread={openThread} />;
      break;
    case "discover":
      page = <DiscoverView me={me} cars={cars} users={users} news={news} meets={meets} communities={communities}
        openCar={openCar} openProfile={openProfile} openCommunity={openCommunity}
        onLikeNews={a.toggleNewsLike} onToggleGoing={a.toggleGoing} onToggleCommunity={a.toggleCommunityMembership}
        onOpenSearch={() => go("search")} onOpenCommunities={() => go("communityList")}
        onOpenMeets={() => go("meetList")} onOpenNews={() => go("newsList")} />;
      break;
    case "search":
      page = <SearchScreen me={me} cars={cars} users={users} communities={communities}
        openCar={openCar} openProfile={openProfile} openCommunity={openCommunity} onToggleCommunity={a.toggleCommunityMembership} />;
      break;
    case "communityList":
      page = <CommunitiesScreen me={me} communities={communities} onToggle={a.toggleCommunityMembership} onOpen={openCommunity}
        onCreate={() => go("createCommunity")} />;
      break;
    case "communityPage":
      page = communities[p.id] && <CommunityPage community={communities[p.id]} me={me} users={users} cars={cars} posts={posts} discussions={discussions}
        onToggle={a.toggleCommunityMembership} openPost={openPost} openProfile={openProfile} openThread={openThread}
        onNewThread={() => go("newThread", { communityId: p.id })} onNewPost={() => go("newPost", { communityId: p.id })}
        tab={p.tab || "posts"} setTab={(t) => patch({ tab: t })}
        onEdit={a.editCommunity} onDelete={async (id) => { await a.deleteCommunity(id); back(); }} />;
      break;
    case "thread": {
      const t = discussions[p.id];
      page = t && <ThreadPage thread={t} community={communities[t.communityId]} me={me} onReply={a.replyThread} onLike={a.toggleThreadLike}
        onDelete={a.deleteThread} openProfile={openProfile} onGone={back} onEdit={a.editThread} onDeleteReply={a.deleteThreadReply} />;
      break;
    }
    case "newThread":
      page = communities[p.communityId] && <NewThreadForm community={communities[p.communityId]}
        onSubmit={async (data) => { const id = await a.createThread({ communityId: p.communityId, ...data }); if (id) replace("thread", { id }); }} />;
      break;
    case "meetList":
      page = <MeetsScreen meets={meets} onOpen={openMeet} onPost={() => go("addMeet")}
        scope={p.scope || "local"} setScope={(sc) => patch({ scope: sc })} />;
      break;
    case "meet":
      page = meets[p.id] && <MeetDetail meet={meets[p.id]} me={me} users={users} onToggleGoing={a.toggleGoing}
        onEdit={(id) => go("addMeet", { id })} onDelete={async (id) => { await a.deleteMeet(id); back(); }} openProfile={openProfile}
        onSetRole={a.setMeetRole} onSetCaps={a.setMeetCaps} />;
      break;
    case "newsList":
      page = <NewsScreen me={me} news={news} onLike={a.toggleNewsLike} />;
      break;
    case "addMeet":
      page = <AddMeetForm key={p.id || "new"} editing={p.id ? meets[p.id] : null}
        onSubmit={async (data) => { const id = await a.submitMeet(data, p.id); if (!id) return; if (p.id) back(); else replace("meet", { id }); }} />;
      break;
    case "createCommunity":
      page = <CreateCommunityForm onSubmit={async (data) => { const id = await a.createCommunity(data); if (id) replace("communityPage", { id }); }} />;
      break;
    case "addCar":
      page = <AddCarForm onSubmit={async (data) => {
        const id = await a.addCar(data);
        if (!id) return;
        // Came from the + menu: land on the car, with back going home. From the profile: back returns to the profile.
        if (stack[stack.length - 2]?.view === "addChoice") { reset(); go("car", { id }); }
        else replace("car", { id });
      }} />;
      break;
    case "editCar":
      page = cars[p.id] && <AddCarForm initial={cars[p.id]} onSubmit={async (data) => { await a.editCar(p.id, data); back(); }} />;
      break;
    case "newPost":
      page = <NewPostForm me={me} cars={cars} communities={communities} initialCommunityId={p.communityId}
        onSubmit={async (data) => { const id = await a.createPost(data); if (!id) return; if (p.communityId) back(); else reset(); }} onNeedCar={() => go("addCar")} />;
      break;
    case "addChoice":
      page = <AddChoiceScreen onNewPost={() => go("newPost")} onSpot={() => go("quickSpot")} onAddCar={() => go("addCar")} />;
      break;
    case "quickSpot":
      page = <SpotForm onSubmit={async (data) => { await a.logSighting(data); reset(); }} />;
      break;
    case "car":
      page = cars[p.id] && <CarPage car={cars[p.id]} me={me} onAddMod={(n, note) => a.addMod(p.id, n, note)}
        onSpot={() => a.spotCar(p.id)} onFollowBuild={() => a.toggleFollowCar(p.id)} openProfile={openProfile}
        onEdit={() => go("editCar", { id: p.id })} onTogglePage={() => a.editCar(p.id, { hasPage: true })} />;
      break;
    case "profile":
      page = p.username && <Profile username={p.username} me={me} cars={cars} posts={posts} users={users} sightings={sightings}
        tab={p.tab || "posts"} setTab={(t) => patch({ tab: t })}
        onToggleFollow={() => a.toggleFollow(p.username)} openCar={openCar} openPost={openPost}
        onAddCar={() => go("addCar")} onOpenSettings={() => go("settings")} />;
      break;
    case "postDetail": {
      const post = posts[p.id];
      // Archived posts are only visible to their author.
      page = post && (!post.archived || post.authorUsername === me) && <PostDetail post={post} me={me} car={cars[post.carId]}
        openCar={openCar} openProfile={openProfile} toggleLike={a.toggleLike} addComment={a.addComment} addReply={a.addReply}
        actions={a} onGone={back} />;
      break;
    }
    case "settings":
      page = <SettingsScreen me={me} users={users} cars={cars} posts={posts} go={go} actions={a} />;
      break;
    case "editProfile":
      page = <EditProfile me={me} users={users} onSave={async (data) => { await a.updateProfile(data); back(); }} />;
      break;
    case "manageCars":
      page = <ManageCars me={me} cars={cars} posts={posts} onOpen={openCar} onEdit={(id) => go("editCar", { id })} onDelete={a.deleteCar} />;
      break;
    case "archive":
      page = <ArchivedPosts me={me} posts={posts} openPost={openPost} onRestore={(id) => a.setArchived(id, false)} />;
      break;
    default:
      page = null;
  }

  // Something on this page was deleted (e.g. a car or post): show a friendly note instead of a blank page.
  if (!page) {
    page = (
      <div style={{ paddingTop: 60, textAlign: "center", color: T.textDim, fontSize: 14 }}>
        This isn't available anymore.
      </div>
    );
  }

  return (
    <SafetyContext.Provider value={{ me, prefs: store.prefs, actions: a, flash: store.flash }}>
    <SheetContext.Provider value={sheetDelta}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative", paddingBottom: 96 + kb, overflowX: "clip" }}>
        {/* No on-screen back arrow: the phone's back gesture/button goes back (see main.jsx). */}
        <div key={cur.key} className="fade-in" data-view={cur.view} style={
          cur.view === "feed" ? { padding: 0 } : cur.view === "car" ? { padding: "0 16px" } : { padding: "18px 16px 0" }}>
          {page}
        </div>

        {toast && (
          <div style={{ position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", background: T.text, color: T.ink, padding: "10px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, zIndex: 60, boxShadow: "0 6px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
            {toast}
          </div>
        )}

        <BottomNav active={activeTab} onTab={onTab} hidden={sheets > 0 || kb > 0} />
      </div>
    </SheetContext.Provider>
    </SafetyContext.Provider>
  );
}
