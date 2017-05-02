var connection;
window.addEventListener("load", function () {
    var nickname = prompt("Choose a nickname")
    if (nickname) {
        connection = new WebSocket("ws://"+window.location.hostname+":8081")
        connection.onopen = function () {
            console.log("Connection opened")
            connection.send(nickname)
            document.getElementById("form").onsubmit = function (event) {
                var msg = document.getElementById("msg")
                if (msg.value)
                    connection.send(msg.value)
                msg.value = ""
                event.preventDefault()
            }
        }
        connection.onclose = function () {
            console.log("Connection closed")
        }
        connection.onerror = function () {
            console.error("Connection error")
        }
        connection.onmessage = function (event) {
            var div = document.createElement("div")
            div.textContent = event.data
            document.body.appendChild(div)
        }
    }
})