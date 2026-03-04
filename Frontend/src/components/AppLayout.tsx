import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
