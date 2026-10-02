export function mobileDockEnabledPath(pathname) {
  return !(
    pathname.startsWith("/admin") ||
    pathname.startsWith("/employer") ||
    pathname.startsWith("/post-job") ||
    pathname.startsWith("/auth/")
  );
}
