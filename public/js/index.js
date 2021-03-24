// like and comment section
$(".like-btn").on("click", function () {
    var current = $(this).attr("id");
    document.querySelector("#" + current + " .like").classList.toggle("d-none");
    document.querySelector("#" + current + " .liked").classList.toggle("d-none");

});
$(".comment-btn").on("click", function () {
    var current = $(this).attr("id");
    // alert(current);
    document.querySelector("#" + current + " .comment").classList.toggle("d-none");
    document.querySelector("#" + current + " .commented").classList.toggle("d-none");

});