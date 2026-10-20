import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { T } from "./theme";
import { useNav } from "./nav/useNav";
import { useKeyboardOffset } from "./lib/keyboard";
import { TopBar, SheetContext } from "./components/ui";
import { BottomNav } from "./components/BottomNav";
import { Feed } from "./screens/Feed";
import { InboxView } from "./screens/Inbox";
import { PostDetail } from "./screens/PostDetail";
import { DiscoverView, SearchScreen, CommunitiesScreen, MeetsScreen, NewsScreen } from "./screens/Discover";
import { CommunityPage, CreateCommunityForm } from "./screens/Communities";
import { CarsView, AddCarForm, CarPage } from "./screens/Cars";
import { Profile } from "./screens/Profile";
import { AddMeetForm } from "./screens/Meets";
import { AddChoiceScreen, NewPostForm, SpotForm } from "./screens/Add";
import { SettingsScreen, EditProfile, ManageCars, ArchivedPosts } from "./screens/Settings";

const ADD_VIEWS = ["addChoice", "newPost", "quickSpot"];

export function Shell({ store, toast }) {
  const { me, cars, posts, users, news, meets, communities, notifications, sightings, actions: a } = store;
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
  const openCar = (id) => go("car", { id });
  const openPost = (id) => go("postDetail", { id });
  const openCommunity = (id) => go("communityPage", { id });

  const showBack = !cur.root;
  const unread = (notifications[me] || []).filter((n) => !n.read).length;

  let page = null;
  switch (cur.view) {
    case "feed":
      page = <Feed me={me} cars={cars} posts={posts} users={users} tab={p.feedTab || "foryou"} setTab={(t) => patch({ feedTab: t })}
        openCar={openCar} openProfile={openProfile} toggleLike={a.toggleLike} addComment={a.addComment} addReply={a.addReply}
        openSearch={() => go("search")} openInbox={() => go("inbox")} unreadCount={unread} actions={a} scrollKey={cur.key} onFollow={a.toggleFollow} />;
      break;
    case "inbox":
      page = <InboxView me={me} notifications={notifications[me] || []} posts={posts} cars={cars}
        onMount={a.markNotificationsRead} openPost={openPost} openCar={openCar} openProfile={openProfile} />;
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
      page = communities[p.id] && <CommunityPage community={communities[p.id]} me={me} cars={cars} posts={posts}
        onToggle={a.toggleCommunityMembership} openPost={openPost} openCar={openCar} />;
      break;
    case "meetList":
      page = <MeetsScreen me={me} meets={meets} onToggleGoing={a.toggleGoing} onPost={() => go("addMeet")}
        onEdit={(id) => go("addMeet", { id })} onDelete={a.deleteMeet} />;
      break;
    case "newsList":
      page = <NewsScreen me={me} news={news} onLike={a.toggleNewsLike} />;
      break;
    case "addMeet":
      page = <AddMeetForm key={p.id || "new"} editing={p.id ? meets[p.id] : null}
        onSubmit={async (data) => { const id = await a.submitMeet(data, p.id); if (id) back(); }} />;
      break;
    case "createCommunity":
      page = <CreateCommunityForm onSubmit={async (data) => { const id = await a.createCommunity(data); if (id) replace("communityPage", { id }); }} />;
      break;
    case "cars":
      page = <CarsView cars={cars} onOpen={openCar} onAdd={() => go("addCar")} />;
      break;
    case "addCar":
      page = <AddCarForm onSubmit={async (data) => { const id = await a.addCar(data); if (id) replace("car", { id }); }} />;
      break;
    case "editCar":
      page = cars[p.id] && <AddCarForm initial={cars[p.id]} onSubmit={async (data) => { await a.editCar(p.id, data); back(); }} />;
      break;
    case "newPost":
      page = <NewPostForm me={me} cars={cars} communities={communities}
        onSubmit={async (data) => { const id = await a.createPost(data); if (id) reset(); }} onNeedCar={() => go("addCar")} />;
      break;
    case "addChoice":
      page = <AddChoiceScreen onNewPost={() => go("newPost")} onSpot={() => go("quickSpot")} />;
      break;
    case "quickSpot":
      page = <SpotForm onSubmit={async (data) => { await a.logSighting(data); reset(); }} />;
      break;
    case "car":
      page = cars[p.id] && <CarPage car={cars[p.id]} me={me} onAddMod={(n, note) => a.addMod(p.id, n, note)}
        onSpot={() => a.spotCar(p.id)} onFollowBuild={() => a.toggleFollowCar(p.id)} openProfile={openProfile}
        onEdit={() => go("editCar", { id: p.id })} />;
      break;
    case "profile":
      page = p.username && <Profile username={p.username} me={me} cars={cars} posts={posts} users={users} sightings={sightings}
        tab={p.tab || "posts"} setTab={(t) => patch({ tab: t })}
        onToggleFollow={() => a.toggleFollow(p.username)} openCar={openCar} openPost={openPost}
        onBrowseCars={() => go("cars")} onOpenSettings={() => go("settings")} />;
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
    <SheetContext.Provider value={sheetDelta}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative", paddingBottom: 96 + kb, overflowX: "clip" }}>
        <TopBar onBack={showBack ? back : null} />
        <div key={cur.key} className="fade-in" data-view={cur.view} style={cur.view === "feed" ? { padding: 0 } : { padding: "0 16px" }}>
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
  );
}
