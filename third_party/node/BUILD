# Node is pinned per host platform; Please builds tools for the host, so there is no exec/target split to choose between.
_VERSION = "22.17.0"

_DISTS = {
    "darwin_arm64": ("darwin-arm64", "615dda58b5fb41fad2be43940b6398ca56554cbe05800953afadc724729cb09e"),
    "darwin_amd64": ("darwin-x64", "c39c8ec3cdadedfcc75de0cb3305df95ae2aecebc5db8d68a9b67bd74616d2ad"),
    "linux_arm64": ("linux-arm64", "3e99df8b01b27dc8b334a2a30d1cd500442b3b0877d217b308fd61a9ccfc33d4"),
    "linux_amd64": ("linux-x64", "0fa01328a0f3d10800623f7107fbcd654a60ec178fab1ef5b9779e94e0419e1a"),
}

_platform, _sha256 = _DISTS[f"{CONFIG.OS}_{CONFIG.ARCH}"]

remote_file(
    name = "dist",
    url = f"https://nodejs.org/dist/v{_VERSION}/node-v{_VERSION}-{_platform}.tar.gz",
    hashes = [_sha256],
    out = "node.tar.gz",
)

genrule(
    name = "node",
    srcs = [":dist"],
    outs = ["node"],
    cmd = "mkdir $OUT && tar -xzf $SRCS -C $OUT --strip-components=1",
    binary = True,
    entry_points = {"node": "node/bin/node"},
    visibility = ["PUBLIC"],
)
