var express = require("express");

const mongoose = require('mongoose');
const Nsg = require('./models/messages');
const mongoDB = 'mongodb+srv://CapooCat:0903930368Ol!@fashionshops.u9czg.mongodb.net/Message-Storage?retryWrites=true&w=majority' //connection string
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Database connected'); //hành động khi đã kết nối được với mongoDB
}).catch(err => console.log(err))

const HistoryMsg = require('./models/messages');
var app = express();
app.use(express.static("public")); //đường dẫn tĩnh aka thư mục gốc cho thư viện
app.set("view engine", "ejs"); //loại view được sử dụng
app.set("views", "./views"); //thư mục chứa view

var server = require("http").Server(app);
var io = require("socket.io")(server);
var User = [];

server.listen(process.env.PORT || 3000); // listen to port 3000

io.on("connection", function (socket) {
    console.log("Co nguoi ket noi: " + socket.id); //lắng nghe kết nối từ client

    socket.on("client-send-data", function (data) {
        var toID = User.map(x => x.Name == data.to ? x.ID : null).filter(x => x != null).toString();
        //io.emit("server-send-data", {from: socket.Username, mess: data.mess}); //gửi data cho tất cả Client kết nối đến
        //io.sockets.emit("server-send-data", data); //gửi data cho mọi client
        //socket.broadcast.emit("server-send-data", data) // gửi data cho mọi client trừ client gửi data này
        if (CheckByValue(data.to)) {

            //lưu data vào models
            var message = new HistoryMsg({
                mess: data.mess,
                from: socket.Username,
                to: data.to
            })

            //Save lên database và thực hiện lệnh
            message.save().then(() => {
                io.to(socket.id).emit("server-send-data", { from: socket.Username, mess: data.mess }); //gửi data cho chính mình
                io.to(toID).emit("server-send-data", { from: socket.Username, mess: data.mess }); //gửi data cho đối tượng muốn gửi tới
            })

        } else {
            var err = "User is disconnected";
            io.to(socket.id).emit("error", err);
        }
    });

    //Tìm kiếm lịch sử chat của người dùng xong trả về Client
    socket.on("get-user-history-chat", function (data) { 
        HistoryMsg.find({$or: [
            {from: socket.Username, to: data},
            {from: data, to: socket.Username}
        ]}).select({mess: 1, from: 1, _id: 0}).then((result) => {
            if(result.length > 0 || result != undefined) {
                io.to(socket.id).emit("history-chat", result);
            }
        });
    });

    //Client đăng ký user
    socket.on("client-register", function (data) {
        console.log(data);
        if (CheckByValue(data)) {
            var err = "Username already exist"
            io.to(socket.id).emit("error", err);
        } else {
            User.push({ Name: data, ID: socket.id });
            socket.Username = data;
            io.to(socket.id).emit("register-response", true);
            io.sockets.emit("update-user", User.map(x => x.Name));
        }
    });

    //gọi khi Client disconnect
    socket.on("disconnect", function () {
        deleteByValue(socket.Username);
        socket.broadcast.emit("update-user", User.map(x => x.Name));
    }); 

    socket.on("hi", function(data) {
        console.log(data);
    });

});

//Xoá user
function deleteByValue(val) {
    if (User != null) {
        for (var f in User) {
            if (User[f].Name == val) {
                User.splice(f, 1);
                console.log(User);
            }
        }
    }
}

//Kiểm tra tên user
function CheckByValue(val) {
    if (User != null) {
        for (var f in User) {
            if (User[f].Name == val) {
                return true;
            }
        }
        return false;
    }
}

app.get("/", function (req, res) {
    res.render("home"); //tên file view .ejs
})