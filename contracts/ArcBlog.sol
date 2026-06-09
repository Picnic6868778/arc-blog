// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// On-chain blog: authors post; readers tip; optional paid posts (premium body behind a price).
contract ArcBlog {
    struct Post { address author; string title; string body; uint256 price; uint256 tips; uint256 unlocks; uint256 createdAt; }
    Post[] public posts;
    mapping(uint256 => mapping(address => bool)) public unlocked;
    mapping(address => uint256[]) public byAuthor;
    event Posted(uint256 indexed id, address author, string title);
    event Tipped(uint256 indexed id, address from, uint256 amount);
    event Unlocked(uint256 indexed id, address reader);
    function post(string calldata title, string calldata body, uint256 price) external {
        posts.push(Post(msg.sender, title, body, price, 0, 0, block.timestamp));
        byAuthor[msg.sender].push(posts.length-1);
        emit Posted(posts.length-1, msg.sender, title);
    }
    function tip(uint256 id) external payable {
        require(msg.value > 0, "Amount required");
        posts[id].tips += msg.value;
        (bool ok,) = payable(posts[id].author).call{value: msg.value}(""); require(ok,"f");
        emit Tipped(id, msg.sender, msg.value);
    }
    function unlock(uint256 id) external payable {
        Post storage p = posts[id];
        require(p.price > 0 && !unlocked[id][msg.sender] && msg.value == p.price, "Cannot unlock");
        unlocked[id][msg.sender] = true; p.unlocks++;
        (bool ok,) = payable(p.author).call{value: msg.value}(""); require(ok,"f");
        emit Unlocked(id, msg.sender);
    }
    function readBody(uint256 id) external view returns (string memory) {
        Post memory p = posts[id];
        if (p.price == 0 || unlocked[id][msg.sender] || p.author == msg.sender) return p.body;
        return "[Premium post - unlock to read]";
    }
    function getMeta(uint256 id) external view returns (address author, string memory title, uint256 price, uint256 tips, uint256 unlocks, uint256 createdAt) {
        Post memory p = posts[id]; return (p.author, p.title, p.price, p.tips, p.unlocks, p.createdAt);
    }
    function getByAuthor(address u) external view returns (uint256[] memory) { return byAuthor[u]; }
    function totalPosts() external view returns (uint256) { return posts.length; }
}