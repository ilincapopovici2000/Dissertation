//Client code JS

var debug = false;

msg_handle = undefined;

//Function to validate the user, team and if the user is in the team searching for the team principal
function teamprinc(cb) {
    var u = Meteor.user();
    if (u && u.Team && u.Team.inTeam) {
        team = u.Team;
        Principal.lookup([new PrincAttr("team", team.inTeamTitle)], team.inTeamCreator,
            function (team_princ) {
                cb(team_princ);
            });
    } else {
        throw new Error("no user, team or in team ");
    }
}

window.jsErrors = [];
window.onerror = function () {
    window.jsErrors[window.jsErrors.length] = arguments;
}

//Events for the signin and signout buttons
document.addEventListener('DOMContentLoaded', function() {
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const main = document.getElementById('main');

    // Function to handle switching to the sign-up panel
    function handleSignUp() {
        main.classList.add("right-panel-active");
        console.log("Switched to sign-up panel");
    }

    // Function to handle switching to the sign-in panel
    function handleSignIn() {
        main.classList.remove("right-panel-active");
    }

    signUpButton.addEventListener('click', handleSignUp);
    signInButton.addEventListener('click', handleSignIn);
});

//Home template
Template.home.teams = function () {
    return  Teams.find();
};

Template.home.user = function () {
    return Meteor.user();
};

//Team template
Template.team.user = function () {
    return Meteor.user();
};

Template.team.peopleInTeam = function () {
    return Teams.findOne({_id: Meteor.user().Team.inTeamID});
};

Template.team.issueCount = function () {
    return Issues.find({tID: Meteor.user().Team.inTeamID});
};

//Lobby template
Template.lobby.teams = function () {
    return Teams.find({ teamTitle: { $ne: ''} });
};

//Home events
Template.home.events({
    'click #signUpNow': function (evt) {
        CreateUser();
    },
    'click #logoutBtn': function (evt) {
        Meteor.logout();
        window.location.reload();
    },
    'click #signInNow': function (evt) {
        LoginUser();
    }
});

//Function to join the team
function joinTeam(evt) {
    var teamID = $(evt.target).attr("teamId");
    msg_handle = Meteor.subscribe("issues", teamID, function () {
        var teamTitle = $(evt.target).attr("teamTitle");
        var teamCreatorID = Teams.findOne({_id: teamID, teamTitle: teamTitle})["createdByID"];
        var creator = Meteor.users.findOne({_id: teamCreatorID})["username"];

        if (debug) console.log("join team " + teamTitle + " with creator " + creator);

        Meteor.call('UpdateUserTeamInfoToInside', teamID, teamTitle);
    });
}

//Lobby events
Template.lobby.events({
    'click #createTeamBtn': function (evt) {
        CreateTeam();
        return false;
    },
    'keypress #teamTitleName': function (evt) {
        if (evt.keyCode == 13) {
            CreateTeam();
            return false;
        }
    },
    'click .joinTeam': function (evt) {
        joinTeam(evt);
    },
    'click .deleteTeam': function (evt) {

        var teamID = $(evt.target).attr("teamId");
        $("#deleteAlert-" + teamID).show('slow');
    },
    'click .cancelDelete': function (evt) {
        var teamID = $(evt.target).attr("teamId");
        $("#deleteAlert-" + teamID).hide('slow');
    },
    'click .deleteConfirm': function (evt) {
        var teamID = $(evt.target).attr("teamId");
        //DELETE Team
        Meteor.call('DeleteTeam', teamID);
    }
});

//Team events
Template.team.events({
    'click #invite': function (evt) {
        var teamID = Meteor.user().Team.inTeamID;
        var invitee = $("#invite_user").val();
        var invitedUser = Meteor.users.findOne({username:invitee});
        if(invitedUser === undefined)
            $("#inviteErroMsg").text('This user does not have an account');
        else{
            var inviteeID = Meteor.users.findOne({username: invitee}, {_id: 1})['_id'];
            Teams.update({_id: teamID}, {$addToSet: {invitedID: inviteeID }});
            teamprinc(function (team_princ) {
                Principal.lookupUser(invitee, function (princ) {
                    Principal.add_access(princ, team_princ, function () {
                        $("#invite_user").val("");
                    });
                });
            });
        }
    },
    'click #createIssueForm': function (){
        var node= document.getElementById("createDiv");
        node.style.display = 'contents';
        var button = document.getElementById("createIssueForm");
        button.style.display = 'none';
    },
    'click .updateIssueForm': function(event) {
        const issueId = event.target.getAttribute('id');
        const updateDiv = document.getElementById('updateDiv-' + issueId);
        const button = document.getElementById(issueId);
        if (updateDiv) {
            if (updateDiv.style.display === 'none' || updateDiv.style.display === '') {
                updateDiv.style.display = 'block';
                button.style.display = 'none';
            } 
        } else {
            console.error('Update div not found for issueId: ' + issueId);
        }
    },
    'click #createIssue': function (evt) {
        var msg = $("#issueTextArea").val();
        var title = $("#teamtitle").text();
        var inCharge = $("#charge").val();
        if(document.getElementById('bugIssue').checked) {
            var type = $("#bugIssue").val();
          }else if(document.getElementById('extensionIssue').checked) {
            var type = $("#extensionIssue").val();
        }
        if(document.getElementById('openIssue').checked) {
            var stat = $("#openIssue").val();
          }else if(document.getElementById('inprogressIssue').checked) {
            var stat = $("#inprogressIssue").val();
        }else if(document.getElementById('closedIssue').checked) {
            var stat = $("#closedIssue").val();
        }
        if(msg === ''){
            $("#msgErroMsg").text('Please write the issue description');
        }
        if(stat === undefined || type === undefined)
            $("#checkErroMsg").text('Please select both a type and status of the issue');
        var userIncharge = Meteor.users.findOne({username: inCharge});
        if(userIncharge === undefined){
            $("#userErroMsg").text('This user does not have an account');
        }
        else{
            var team_inv = Teams.findOne({invitedID: userIncharge._id});
            var team_creat = Teams.findOne({createdByID: userIncharge._id});
            if (team_inv === undefined && team_creat === undefined ) {
                $("#userErroMsg").text('This user is not a member of this team');
            }
            else{
                teamprinc(function (team_princ) {
                    Issues.insert({
                        tID: Meteor.user().Team.inTeamID,
                        teamprinc: team_princ._id,
                        teamTitle: title,
                        issue: msg,
                        issueType: type,
                        issueStatus: stat,
                        userInCharge: inCharge,
                        userID: Meteor.userId(),
                        username: Meteor.user().username,
                        time: getFormattedDate()
                    });
                });
                $("#issueTextArea").val('');
                $("#charge").val('');
                $("#userErroMsg").text('');
                var node= document.getElementById("createDiv");
                node.style.display = 'none';
                var button = document.getElementById("createIssueForm");
                button.style.display = 'block';
            }
        }
    },
    'click .updates': function(event) {
        const issueId = event.target.getAttribute('id');
        var msg = $("#issueTextArea-"+ issueId).val();
        var title = $("#teamtitle").text();
        var inCharge = $("#charge-"+ issueId).val();
        if(document.getElementById('bugIssue-'+ issueId).checked) {
            var type = $("#bugIssue-"+issueId).val();
          }else if(document.getElementById('extensionIssue-'+ issueId).checked) {
            var type = $("#extensionIssue-"+ issueId).val();
        }
        if(document.getElementById('openIssue-'+ issueId).checked) {
            var stat = $("#openIssue-"+ issueId).val();
          }else if(document.getElementById('inprogressIssue-'+ issueId).checked) {
            var stat = $("#inprogressIssue-"+ issueId).val();
        }else if(document.getElementById('closedIssue-'+ issueId).checked) {
            var stat = $("#closedIssue-"+ issueId).val();
        }
        var userIncharge = Meteor.users.findOne({username: inCharge});
        if(userIncharge === undefined){
            $("#userUpdateErroMsg-"+ issueId).text('This user does not have an account');
            console.log("no account");
        }
        else{
            var team_inv = Teams.findOne({invitedID: userIncharge._id});
            var team_creat = Teams.findOne({createdByID: userIncharge._id});
            if (team_inv === undefined && team_creat === undefined) {
                $("#userUpdateErroMsg-"+ issueId).text('This user is not a member of this team');
                console.log("no team acces");
            }
            else{
                Meteor.call('DeleteIssue', issueId);
                teamprinc(function (team_princ) {
                    Issues.insert({
                        tID: Meteor.user().Team.inTeamID,
                        teamprinc: team_princ._id,
                        teamTitle: title,
                        issue: msg,
                        issueType: type,
                        issueStatus: stat,
                        userInCharge: inCharge,
                        userID: Meteor.userId(),
                        username: Meteor.user().username,
                        time: getFormattedDate()
                    });
                });
                $("#userUpdateErroMsg-"+ issueId).text('');
                const updateDiv = document.getElementById('updateDiv-' + issueId);
                const button = document.getElementById(issueId);
                if (updateDiv) {
                    updateDiv.style.display = 'none';
                    button.style.display = 'block';
                } else {
                    console.error('Update div not found for issueId: ' + issueId);
                }
            }
        }
    },
    'keypress #issueTextArea': function (evt) {
        if (evt.keyCode == 13) {
            if (evt.shiftKey === true) {
                // new line
                return true;
            }
            else {

                var msg = $("#issueTextArea").val();
                var title = $("#teamtitle").text();
                var inCharge = $("#charge").val();
                if(document.getElementById('bugIssue').checked) {
                    var type = $("#bugIssue").val();
                  }else if(document.getElementById('extensionIssue').checked) {
                    var type = $("#extensionIssue").val();
                }
                if(document.getElementById('openIssue').checked) {
                    var stat = $("#openIssue").val();
                  }else if(document.getElementById('inprogressIssue').checked) {
                    var stat = $("#inprogressIssue").val();
                }else if(document.getElementById('closedIssue').checked) {
                    var stat = $("#closedIssue").val();
                }
                var creator = $("#teamcreator").text();
                teamprinc(function (team_princ) {
                    Issues.insert({
                        tID: Meteor.user().Team.inTeamID,
                        teamprinc: team_princ._id,
                        teamTitle: title,
                        issue: msg,
                        issueType: type,
                        issueStatus: stat,
                        userInCharge: inCharge,
                        userID: Meteor.userId(),
                        username: Meteor.user().username,
                        time: getFormattedDate()
                    });
                    $("#issueTextArea").val('');
                    $("#charge").val('');
                });
            }
            return false;
        }
    },
    'click #exitTeam': function (evt) {
        var teamID = $(evt.target).attr("teamId");
        if (msg_handle) {
            msg_handle.stop();
        }
        Meteor.call('UpdateUserTeamInfoToOutside', teamID);
    }

});


//Additional functions
function CreateUser() {
    var user = $("#username").val().trim();
    var password = $("#password").val().trim();
    if (user.length >= 0 && password.length != 0) {
        Accounts.createUser({username: user, email: user, password: password}, function (error) {
            if (error) {
                $("#errorUsernameMsg").text(error);
            }
        });
    } else {
        $("#errorUsernameMsg").text('Username and Password must be non empty.');
    }
}

function LoginUser() {
    var username = $("#usernameLogin").val().trim();
    var password = $("#passwordLogin").val().trim();

    Meteor.loginWithPassword({email: username}, password,
        function (error) {
            if (error) {
                $("#loginErroMsg").text('Warning: Incorrect Login: ' + error);
            } else {
                $('#usernameLogin').val('');
                $('#passwordLogin').val('');
                $("#loginErroMsg").text('');
            }
        });
}

function CreateTeam() {
    var teamtitle = $("#teamTitleName").val().trim();
    if (teamtitle.length !== 0 && teamtitle.length >= 4 && teamtitle.length <= 16) {
        Principal.create("team", teamtitle, Principal.user(), function (tp) {
            Teams.insert({teamTitle: teamtitle, peopleID: [], peopleUsername: [], invitedID: [],
                createdByID: Meteor.userId(), teamprinc: tp._id });

            $("#createTeamErroMsg").text('');

            $("#teamTitleName").val('');
        });

    } else {
        $("#createTeamErroMsg").text('Please fill in field - Must contain at LEAST 3 and at MOST 14 Characters');
    }
}

function getFormattedDate() {
    var date = new Date();
    var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" +
        date.getDate() + " " + date.getHours() + ":" +
        date.getMinutes() + ":" + date.getSeconds();

    return str;
}

Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Deps.autorun(function () {
    Meteor.subscribe("teams");
    Meteor.subscribe("users");
});

Template.team.rendered = function () {
    //Scroll the msglog All the way to the end
    var elem = document.getElementById('msgLog');
    elem.scrollTop = elem.scrollHeight;

}
