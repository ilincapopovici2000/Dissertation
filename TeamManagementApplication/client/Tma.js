//Client code JS

var debug = false;

msg_handle = undefined;

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

//HOME TEMPLATE
Template.home.teams = function () {
    return  Teams.find();
};

Template.home.user = function () {
    return Meteor.user();
};


//TEAM TEMPLATE
Template.team.user = function () {
    return Meteor.user();
};

Template.team.peopleInTeam = function () {
    return Teams.findOne({_id: Meteor.user().Team.inTeamID});
};

Template.team.issueCount = function () {
    return Issues.find({tID: Meteor.user().Team.inTeamID});
};

//LOBBY TEMPLATE
Template.lobby.teams = function () {
    return Teams.find({ teamTitle: { $ne: ''} });
};


//EVENTS HANDLERS BUTTON
Template.home.events({
    'click #signUpNow': function (evt) {
        CreateUser();
    },
    'click #logoutBtn': function (evt) {
        Meteor.logout();
    },
    'click #signInNow': function (evt) {
            LoginUser();
    }
});

function handleSignUp() {
    const main = document.getElementById('main');
    main.classList.add("right-panel-active");
}



function joinTeam(evt) {
    var teamID = $(evt.target).attr("teamId");
    msg_handle = Meteor.subscribe("issues", teamID, function () {
        var teamTitle = $(evt.target).attr("teamTitle");
        //TODO: display creator to users
        var teamCreatorID = Teams.findOne({_id: teamID, teamTitle: teamTitle})["createdByID"];
        var creator = Meteor.users.findOne({_id: teamCreatorID})["username"];

        if (debug) console.log("join team " + teamTitle + " with creator " + creator);

        //UPDATE user WHEN JOINED TEAM
        Meteor.call('UpdateUserTeamInfoToInside', teamID, teamTitle);
    });
}


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

Template.team.events({
    'click #invite': function (evt) {
        var teamID = Meteor.user().Team.inTeamID;
        var invitee = $("#invite_user").val();
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
});

Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Template.team.events({
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
        var node= document.getElementById("createDiv");
        node.style.display = 'none';
        var button = document.getElementById("createIssueForm");
        button.style.display = 'block';

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
    },

    'click .updates': function(event) {
        const issueId = event.target.getAttribute('id');
        const updateDiv = document.getElementById('updateDiv-' + issueId);
        const button = document.getElementById(issueId);
        if (updateDiv) {
            updateDiv.style.display = 'none';
            button.style.display = 'block';
        } else {
            console.error('Update div not found for issueId: ' + issueId);
        }

        var msg = $("#issueTextArea-"+ issueId).val();
        var title = $("#teamtitle").text();
        var inCharge = $("#charge-"+ issueId).val();
        console.log(document.getElementById('bugIssue-'+ issueId));
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
        var creator = $("#teamcreator").text();
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
            $("#issueTextArea").val('');
            $("#charge").val('');
        });
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
                var creator = $("#teamcreator").text();//why do we need Team creator here?
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


//FUNCTIONS
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
                //alert("Failed to login");
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


Deps.autorun(function () {
    Meteor.subscribe("teams");
    Meteor.subscribe("users");
});


Template.lobby.rendered = function () {
    var team = Teams.find({});
    team.forEach(function (team) {
        $('.tooltip-' + team._id).tooltip({trigger: 'click'});

        //DELETE BUTTON SHOW
        if (team.createdByID === Meteor.userId()) {
            $('#delete-' + team._id).show();
        } else {
            $('#delete-' + team._id).hide();
        }
    });
}

Template.team.rendered = function () {
    //Scroll the msglog All the way to the end
    var elem = document.getElementById('msgLog');
    elem.scrollTop = elem.scrollHeight;

}
