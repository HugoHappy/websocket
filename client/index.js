class Chat {
    constructor() {
        var url = window.location.hostname;
        this.ws = new WebSocket("ws://" + url + ":3001");

        this.ws.onerror = (error) => {
            $("#connection_label").html("Not connected: error");
        };

        this.ws.onopen = () => {
            $("#connection_label").html("Connected");
        };

        this.ws.onmessage = (event) => {
            var json=JSON.parse(event.data);
            if(json.message){
                var date = new Date();
                var hour = date.getHours();
                var minute = date.getMinutes();
                var time = hour + ':' + minute;
                $("#messageBoard").append('<li>' + time + ' <b>' + json.message.name + ':</b> ' +  json.message.text.fontcolor(json.message.color) +'</li>');
            }
        };

        this.ws.onclose = function(message) {
            $("#connection_label").html("Not connected: closed connection");
        };
    }

    send_text() {
        if(this.ws.readyState==1) {
            var json={"message": { "name": $("#name").val(), "color": $("#color").val(), "text": $("#message").val()}};
            this.ws.send(JSON.stringify(json));
        }
    }
}

var chat;
$(document).ready(function(){
    chat = new Chat();
});
