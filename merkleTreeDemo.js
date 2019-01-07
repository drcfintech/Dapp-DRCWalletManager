const merkle = require('merkle');

const getMerkle = () => {

    let data = [
        "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5",
        "f6ff5adab5180a3d10ffb611f2caddd0a2b0922bde398ad186e946480bec3943",
        "3ba067469805939235e0d4e553501c05c8ad33a79ad21710d174d448bfb6409b",
        "133a0bfd1812bddbeb47ff8f3725b73db0143fd7c8b1cf8cb1e965fc44adf3f9",
        "015e81eddfab44be16ac53a8653feab50859b4c5508a915679e33c271d2b54df",
        "5570b8fffb53088e058bb8676e9ff407906055343b2aeb12877b68e971f2bedd"
    ];
    let sha256tree = merkle('sha256').sync(data),
        depth = sha256tree.depth(),
        root = sha256tree.root();

    console.log("root=>", root);
    console.log("depth=>", depth);
}
module.exports = getMerkle;