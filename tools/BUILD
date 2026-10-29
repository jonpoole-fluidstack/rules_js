# The generators are TypeScript run straight from source by node's type stripping.
# Their one dependency, js-yaml, is fetched on its own: it can't come from the
# node_modules these tools generate.
remote_file(
    name = "js_yaml",
    url = "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.0.tgz",
    hashes = ["0dae332559cf22b21c26ea70e732afd8303ff99412f9c3d9d209faa8882cf2ca"],
    out = "js-yaml.tgz",
)

genrule(
    name = "tools",
    srcs = {
        "ts": [
            "lock_file_download.ts",
            "lockfile.ts",
            "node_modules_link.ts",
        ],
        "yaml": [":js_yaml"],
    },
    outs = ["tools"],
    cmd = "mkdir $OUT && cp $SRCS_TS $OUT/ && tar -xzf $SRCS_YAML -O package/dist/js-yaml.mjs > $OUT/js-yaml.mjs",
    visibility = ["PUBLIC"],
)
