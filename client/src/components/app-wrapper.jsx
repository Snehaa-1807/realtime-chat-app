import AsideBar from "./aside-bar";

const AppWrapper = ({ children }) => {
  return (
    <div className="h-full">
      <AsideBar />
      <main className="lg:pl-10 h-full">{children}</main>
    </div>
  );
};

export default AppWrapper;
