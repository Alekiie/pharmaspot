const jsPDF = require("jspdf");
const html2canvas = require("html2canvas");
const JsBarcode = require("jsbarcode");
const macaddress = require("macaddress");
const notiflix = require("notiflix");
const validator = require("validator");
const DOMPurify = require("dompurify");
const _ = require("lodash");
let fs = require("fs");
let path = require("path");
let moment = require("moment");
let { ipcRenderer } = require("electron");
let dotInterval = setInterval(function () {
  $(".dot").text(".");
}, 3000);
let Store = require("electron-store");
const remote = require("@electron/remote");
const app = remote.app;
let cart = [];
let index = 0;
let allUsers = [];
let allPatients = [];
let allProducts = [];
let allCategories = [];
let allTransactions = [];
let sold = [];
let state = [];
let sold_items = [];
let item;
let auth;
let holdOrder = 0;
let vat = 0;
let perms = null;
let deleteId = 0;
let paymentType = 0;
let receipt = "";
let totalVat = 0;
let subTotal = 0;
let method = "";
let order_index = 0;
let user_index = 0;
let product_index = 0;
let transaction_index;
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
let host = "localhost";
let port = process.env.PORT || "3210";
let img_path = path.join(appData, appName, "uploads", "/");
let api = "http://" + host + ":" + port + "/api/";
const bcrypt = require("bcrypt");
let categories = [];
let holdOrderList = [];
let customerOrderList = [];
let ownUserEdit = null;
let totalPrice = 0;
let orderTotal = 0;
let consultationCharge = 0;
let consultationPatient = null;
let auth_error = "Incorrect username or password";
let auth_empty = "Please enter a username and password";
let holdOrderlocation = $("#renderHoldOrders");
let customerOrderLocation = $("#renderCustomerOrders");
let storage = new Store();
let settings;
let platform;
let user = {};
let start = moment().startOf("month");
let end = moment();
let start_date = moment(start).toDate();
let end_date = moment(end).toDate();
let by_till = 0;
let by_user = 0;
let by_status = 1;
let reportStart = moment().subtract(29, "days").startOf("day");
let reportEnd = moment().endOf("day");
const default_item_img = path.join("assets", "images", "default.jpg");
const permissions = [
  "perm_products",
  "perm_categories",
  "perm_transactions",
  "perm_users",
  "perm_settings",
];
notiflix.Notify.init({
  position: "right-top",
  cssAnimationDuration: 600,
  messageMaxLength: 150,
  clickToClose: true,
  closeButton: true,
});
const {
  DATE_FORMAT,
  moneyFormat,
  isExpired,
  daysToExpire,
  getStockStatus,
  checkFileExists,
  setContentSecurityPolicy,
} = require("./utils");

//set the content security policy of the app
setContentSecurityPolicy();

$(function () {
  function cb(start, end) {
    $("#reportrange span").html(
      start.format("MMMM D, YYYY") + "  -  " + end.format("MMMM D, YYYY"),
    );
  }

  $("#reportrange").daterangepicker(
    {
      startDate: start,
      endDate: end,
      autoApply: true,
      timePicker: true,
      timePicker24Hour: true,
      timePickerIncrement: 10,
      timePickerSeconds: true,
      // minDate: '',
      ranges: {
        Today: [moment().startOf("day"), moment()],
        Yesterday: [
          moment().subtract(1, "days").startOf("day"),
          moment().subtract(1, "days").endOf("day"),
        ],
        "Last 7 Days": [
          moment().subtract(6, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "Last 30 Days": [
          moment().subtract(29, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "This Month": [moment().startOf("month"), moment().endOf("month")],
        "This Month": [moment().startOf("month"), moment()],
        "Last Month": [
          moment().subtract(1, "month").startOf("month"),
          moment().subtract(1, "month").endOf("month"),
        ],
      },
    },
    cb,
  );

  cb(start, end);

  function reportCb(start, end) {
    $("#reportSalesRange span").html(
      start.format("MMMM D, YYYY") + "  -  " + end.format("MMMM D, YYYY"),
    );
  }

  $("#reportSalesRange").daterangepicker(
    {
      startDate: reportStart,
      endDate: reportEnd,
      autoApply: true,
      ranges: {
        Today: [moment().startOf("day"), moment()],
        "Last 7 Days": [
          moment().subtract(6, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "Last 30 Days": [
          moment().subtract(29, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "This Month": [moment().startOf("month"), moment()],
        "Last Month": [
          moment().subtract(1, "month").startOf("month"),
          moment().subtract(1, "month").endOf("month"),
        ],
      },
    },
    reportCb,
  );

  reportCb(reportStart, reportEnd);

  $("#expirationDate").daterangepicker({
    singleDatePicker: true,
    locale: {
      format: DATE_FORMAT,
    },
  });
});

//Allow only numbers in input field
$.fn.allowOnlyNumbers = function () {
  return this.on("keydown", function (e) {
    // Allow: backspace, delete, tab, escape, enter, ., ctrl/cmd+A, ctrl/cmd+C, ctrl/cmd+X, ctrl/cmd+V, end, home, left, right, down, up
    if (
      $.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
      (e.keyCode >= 35 && e.keyCode <= 40) ||
      ((e.keyCode === 65 ||
        e.keyCode === 67 ||
        e.keyCode === 86 ||
        e.keyCode === 88) &&
        (e.ctrlKey === true || e.metaKey === true))
    ) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if (
      (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
      (e.keyCode < 96 || e.keyCode > 105)
    ) {
      e.preventDefault();
    }
  });
};
$(".number-input").allowOnlyNumbers();

//Serialize Object
$.fn.serializeObject = function () {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name]) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || "");
    } else {
      o[this.name] = this.value || "";
    }
  });
  return o;
};

auth = storage.get("auth");
user = storage.get("user");

$("#main_app").hide();
if (auth == undefined) {
  $.get(api + "users/check/", function (data) {});

  authenticate();
} else {
  $("#login").hide();
  $("#main_app").show();
  platform = storage.get("settings");

  if (platform != undefined) {
    if (platform.app == "Network Point of Sale Terminal") {
      const remotePort = platform.port || port;
      api = "http://" + platform.ip + ":" + remotePort + "/api/";
      perms = true;
    }
  }

  $.get(api + "users/user/" + user._id, function (data) {
    user = data;
    $("#loggedin-user").text(user.fullname);
  });

  $.get(api + "settings/get", function (data) {
    settings = data && data.settings ? data.settings : data;
  });

  $.get(api + "users/all", function (users) {
    allUsers = [...users];
  });

  $(document).ready(function () {
    //update title based on company
    let appTitle = !!settings
      ? `${validator.unescape(settings.store)} - ${appName}`
      : appName;
    $("title").text(appTitle);

    $(".loading").hide();

    loadCategories();
    loadProducts();
    loadCustomers();

    if (settings && validator.unescape(settings.symbol)) {
      $("#price_curr, #payment_curr, #change_curr").text(
        validator.unescape(settings.symbol),
      );
    }

    setTimeout(function () {
      if (settings == undefined && auth != undefined) {
        $("#settingsModal").modal("show");
      } else {
        vat = parseFloat(validator.unescape(settings.percentage));
        $("#taxInfo").text(settings.charge_tax ? vat : 0);
      }
    }, 1500);

    $("#settingsModal").on("hide.bs.modal", function () {
      setTimeout(function () {
        if (settings == undefined && auth != undefined) {
          $("#settingsModal").modal("show");
        }
      }, 1000);
    });

    if (0 == user.perm_products) {
      $(".p_one").hide();
    }
    if (0 == user.perm_categories) {
      $(".p_two").hide();
    }
    if (0 == user.perm_transactions) {
      $(".p_three").hide();
    }
    if (0 == user.perm_users) {
      $(".p_four").hide();
    }
    if (0 == user.perm_settings) {
      $(".p_five").hide();
    }

    function loadProducts() {
      $.get(api + "inventory/products", function (data) {
        data.forEach((item) => {
          item.price = parseFloat(item.price).toFixed(2);
        });

        allProducts = [...data];

        loadProductList();

        let delay = 0;
        let expiredCount = 0;
        allProducts.forEach((product) => {
          let todayDate = moment();
          let expiryDate = moment(product.expirationDate, DATE_FORMAT);

          if (!isExpired(expiryDate)) {
            const diffDays = daysToExpire(expiryDate);

            if (diffDays > 0 && diffDays <= 30) {
              var days_noun = diffDays > 1 ? "days" : "day";
              notiflix.Notify.warning(
                `${product.name} has only ${diffDays} ${days_noun} left to expiry`,
              );
            }
          } else {
            expiredCount++;
          }
        });

        //Show notification if there are any expired goods.
        if (expiredCount > 0) {
          notiflix.Notify.failure(
            `${expiredCount} ${
              expiredCount > 0 ? "products" : "product"
            } expired. Please restock!`,
          );
        }

        $("#parent").text("");

        data.forEach((item) => {
          if (!categories.includes(item.category)) {
            categories.push(item.category);
          }
          let item_isExpired = isExpired(item.expirationDate);
          let item_stockStatus = getStockStatus(item.quantity, item.minStock);
          if (item.img === "") {
            item_img = default_item_img;
          } else {
            item_img = path.join(img_path, item.img);
            item_img = checkFileExists(item_img) ? item_img : default_item_img;
          }

          let item_info = `<div class="col-lg-2 box ${item.category}"
                                onclick="$(this).addToCart(${item._id}, ${
                                  item.quantity
                                }, ${item.stock})">
                            <div class="widget-panel widget-style-2 " title="${item.name}">                    
                            <div id="image"><img src="${item_img}" id="product_img" alt=""></div>                    
                                        <div class="text-muted m-t-5 text-center">
                                        <div class="name" id="product_name"><span class="${
                                          item_isExpired ? "text-danger" : ""
                                        }">${item.name}</span></div> 
                                        <span class="sku">${
                                          item.barcode || item._id
                                        }</span>
                                        <span class="${item_stockStatus < 1 ? "text-danger" : ""}"><span class="stock">STOCK </span><span class="count">${
                                          item.stock == 1
                                            ? item.quantity
                                            : "N/A"
                                        }</span></span></div>
                                        <span class="text-success text-center"><b data-plugin="counterup">${
                                          validator.unescape(settings.symbol) +
                                          moneyFormat(item.price)
                                        }</b> </span>
                            </div>
                        </div>`;
          $("#parent").append(item_info);
        });
      });
    }

    function loadCategories() {
      $.get(api + "categories/all", function (data) {
        allCategories = data;
        loadCategoryList();
        $("#category,#categories").html(`<option value="0">Select</option>`);
        allCategories.forEach((category) => {
          $("#category,#categories").append(
            `<option value="${category._id}">${category.name}</option>`,
          );
        });
      });
    }

    function loadCustomers() {
      $.get(api + "customers/all", function (customers) {
        $("#customer").html(
          `<option value="0" selected="selected">Walk in customer</option>`,
        );

        customers.forEach((cust) => {
          const customerValue = {
            id: cust._id,
            name: cust.name,
            phone: cust.phone || "",
            email: cust.email || "",
            address: cust.address || "",
            diagnosis: cust.diagnosis || "",
            feeling: cust.feeling || "",
            medicine_given: cust.medicine_given || "",
            consultation_done: !!cust.consultation_done,
            consultation_fee: cust.consultation_fee || 0,
          };

          $("#customer").append(
            $("<option>", {
              value: JSON.stringify(customerValue),
              text: cust.name,
            }),
          );
        });
      });
    }

    function loadPatientList() {
      let patient_list = "";
      let counter = 0;

      allPatients = [];
      $("#patient_list").empty();

      if ($.fn.DataTable.isDataTable("#patientList")) {
        $("#patientList").DataTable().destroy();
      }

      $.get(api + "customers/all", function (patients) {
        allPatients = [...patients];

        patients.forEach((patient, patientIndex) => {
          counter++;
          patient_list += `<tr>
            <td>${DOMPurify.sanitize(patient.name || "")}</td>
            <td>${DOMPurify.sanitize(patient.phone || "")}</td>
            <td>${DOMPurify.sanitize(patient.email || "")}</td>
            <td>${DOMPurify.sanitize(patient.address || "")}</td>
            <td>${DOMPurify.sanitize(patient.diagnosis || "")}</td>
            <td>${DOMPurify.sanitize(patient.feeling || "")}</td>
            <td>${DOMPurify.sanitize(patient.medicine_given || "")}</td>
            <td>${patient.consultation_done ? "Consultation done" : "Medicine only"}</td>
            <td class="patient-actions">
              <div class="patient-action-group">
                <button onClick="$(this).dispensePatient(${patientIndex})" class="btn btn-info btn-sm patient-action-btn">Dispense</button>
                ${
                  patient.consultation_done &&
                  parseFloat(patient.consultation_fee || 0) > 0
                    ? `<button onClick="$(this).addConsultationFee(${patientIndex})" class="btn btn-success btn-sm patient-action-btn">Add Consultation Fee</button>`
                    : ""
                }
                <button onClick="$(this).editPatientRow(${patientIndex})" class="btn btn-warning btn-sm patient-action-btn patient-action-icon"><i class="fa fa-edit"></i></button>
                <button onClick="$(this).deletePatient('${patient._id}')" class="btn btn-danger btn-sm patient-action-btn patient-action-icon"><i class="fa fa-trash"></i></button>
              </div>
            </td>
          </tr>`;

          if (counter == patients.length) {
            $("#patient_list").html(patient_list);

            $("#patientList").DataTable({
              order: [[0, "asc"]],
              autoWidth: false,
              info: true,
              JQueryUI: true,
              ordering: true,
              paging: false,
            });
          }
        });
      });
    }

    $.fn.patientCustomerValue = function (patient) {
      return JSON.stringify({
        id: patient._id,
        name: patient.name || "",
        phone: patient.phone || "",
        email: patient.email || "",
        address: patient.address || "",
        diagnosis: patient.diagnosis || "",
        feeling: patient.feeling || "",
        medicine_given: patient.medicine_given || "",
        consultation_done: !!patient.consultation_done,
        consultation_fee: patient.consultation_fee || 0,
      });
    };

    $.fn.setSelectedCustomer = function (patient) {
      $("#customer")
        .val($(this).patientCustomerValue(patient))
        .trigger("chosen:updated");
    };

    $.fn.dispensePatient = function (index) {
      const patient = allPatients[index];
      if (!patient) {
        return;
      }

      clearConsultationCharge();
      $(this).setSelectedCustomer(patient);
      $(this).renderTable(cart);
      $("#Patients").modal("hide");
      $("#pointofsale").trigger("click");
    };

    $.fn.addConsultationFee = function (index) {
      const patient = allPatients[index];
      if (!patient) {
        return;
      }

      consultationPatient = patient;
      consultationCharge = parseFloat(patient.consultation_fee || 0);
      $(this).setSelectedCustomer(patient);
      $(this).renderTable(cart);
      $("#Patients").modal("hide");
      $("#pointofsale").trigger("click");
      notiflix.Report.info(
        "Consultation fee added",
        `Consultation fee set for ${patient.name || "this patient"}. Proceed to payment to record it.`,
        "Ok",
      );
    };

    $.fn.editPatientRow = function (index) {
      const patient = allPatients[index];
      if (!patient) {
        return;
      }

      $("#customer_id").val(patient._id);
      $("#userName").val(patient.name || "");
      $("#phoneNumber").val(patient.phone || "");
      $("#emailAddress").val(patient.email || "");
      $("#userAddress").val(patient.address || "");
      $("#diagnosis").val(patient.diagnosis || "");
      $("#feeling").val(patient.feeling || "");
      $("#medicine_given").val(patient.medicine_given || "");
      $("#consultation_done").prop("checked", !!patient.consultation_done);
      $("#consultation_fee").val(patient.consultation_fee || "");
      $("#customerModalTitle").text("Edit Patient");
      $("#saveCustomerBtn").val("Update Patient");
      $("#Patients").modal("hide");
      $("#newCustomer").modal("show");
    };

    $.fn.deletePatient = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this patient record. This cannot be undone.",
        okButtonText: "Yes, delete!",
        cancelButtonText: "Cancel",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "customers/customer/" + id,
            type: "DELETE",
            success: function (result) {
              loadPatientList();
              loadCustomers();
              notiflix.Report.success("Done!", "Patient record deleted", "Ok");
            },
          });
        },
      );
    };

    $.fn.addToCart = function (id, count, stock) {
      $.get(api + "inventory/product/" + id, function (product) {
        if (isExpired(product.expirationDate)) {
          notiflix.Report.failure(
            "Expired",
            `${product.name} is expired! Please restock.`,
            "Ok",
          );
        } else {
          if (count > 0) {
            $(this).addProductToCart(product);
          } else {
            if (stock == 1) {
              notiflix.Report.failure(
                "Out of stock!",
                `${product.name} is out of stock! Please restock.`,
                "Ok",
              );
            }
          }
        }
      });
    };

    function barcodeSearch(e) {
      e.preventDefault();
      let searchBarCodeIcon = $(".search-barcode-btn").html();
      $(".search-barcode-btn").empty();
      $(".search-barcode-btn").append(
        $("<i>", { class: "fa fa-spinner fa-spin" }),
      );

      let req = {
        skuCode: $("#skuCode").val(),
      };

      $.ajax({
        url: api + "inventory/product/sku",
        type: "POST",
        data: JSON.stringify(req),
        contentType: "application/json; charset=utf-8",
        cache: false,
        processData: false,
        success: function (product) {
          $(".search-barcode-btn").html(searchBarCodeIcon);
          const expired = isExpired(product.expirationDate);
          if (product._id != undefined && product.quantity >= 1 && !expired) {
            $(this).addProductToCart(product);
            $("#searchBarCode").get(0).reset();
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-ok" }),
            );
          } else if (expired) {
            notiflix.Report.failure(
              "Expired!",
              `${product.name} is expired`,
              "Ok",
            );
          } else if (product.quantity < 1) {
            notiflix.Report.info(
              "Out of stock!",
              "This item is currently unavailable",
              "Ok",
            );
          } else {
            notiflix.Report.warning(
              "Not Found!",
              "<b>" + $("#skuCode").val() + "</b> is not a valid barcode!",
              "Ok",
            );

            $("#searchBarCode").get(0).reset();
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-ok" }),
            );
          }
        },
        error: function (err) {
          if (err.status === 422) {
            $(this).showValidationError(data);
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-remove" }),
            );
          } else if (err.status === 404) {
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-remove" }),
            );
          } else {
            $(this).showServerError();
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
              $("<i>", { class: "glyphicon glyphicon-warning-sign" }),
            );
          }
        },
      });
    }

    $("#searchBarCode").on("submit", function (e) {
      barcodeSearch(e);
    });

    $("body").on("click", "#jq-keyboard button", function (e) {
      let pressed = $(this)[0].className.split(" ");
      if ($("#skuCode").val() != "" && pressed[2] == "enter") {
        barcodeSearch(e);
      }
    });

    $.fn.addProductToCart = function (data) {
      item = {
        id: data._id,
        product_name: data.name,
        sku: data.sku,
        price: data.price,
        quantity: 1,
      };

      if ($(this).isExist(item)) {
        $(this).qtIncrement(index);
      } else {
        cart.push(item);
        $(this).renderTable(cart);
      }
    };

    $.fn.isExist = function (data) {
      let toReturn = false;
      $.each(cart, function (index, value) {
        if (value.id == data.id) {
          $(this).setIndex(index);
          toReturn = true;
        }
      });
      return toReturn;
    };

    $.fn.setIndex = function (value) {
      index = value;
    };

    $.fn.calculateCart = function () {
      let total = 0;
      let grossTotal;
      let total_items = 0;
      $.each(cart, function (index, data) {
        total += data.quantity * data.price;
        total_items += parseInt(data.quantity);
      });
      $("#total").text(total_items);
      const discount = parseFloat($("#inputDiscount").val() || 0);
      const consultation = parseFloat(consultationCharge || 0);

      total = total - discount;
      $("#price").text(
        validator.unescape(settings.symbol) + moneyFormat(total.toFixed(2)),
      );

      subTotal = total;

      if ($("#inputDiscount").val() >= total) {
        $("#inputDiscount").val(0);
      }

      if (settings.charge_tax) {
        totalVat = (total * vat) / 100;
        grossTotal = total + totalVat + consultation;
      } else {
        grossTotal = total + consultation;
      }

      orderTotal = grossTotal.toFixed(2);

      $("#gross_price").text(
        validator.unescape(settings.symbol) + moneyFormat(orderTotal),
      );
      $("#payablePrice").val(moneyFormat(grossTotal));
    };

    function consultationFeeValue() {
      return parseFloat(consultationCharge || 0);
    }

    function clearConsultationCharge() {
      consultationCharge = 0;
      consultationPatient = null;
    }

    $.fn.renderTable = function (cartList) {
      $("#cartTable .card-body").empty();
      $(this).calculateCart();
      $.each(cartList, function (index, data) {
        $("#cartTable .card-body").append(
          $("<div>", { class: "row m-t-10" }).append(
            $("<div>", { class: "col-md-1", text: index + 1 }),
            $("<div>", { class: "col-md-3", text: data.product_name }),
            $("<div>", { class: "col-md-3" }).append(
              $("<div>", { class: "input-group" }).append(
                $("<span>", { class: "input-group-btn" }).append(
                  $("<button>", {
                    class: "btn btn-light",
                    onclick: "$(this).qtDecrement(" + index + ")",
                  }).append($("<i>", { class: "fa fa-minus" })),
                ),
                $("<input>", {
                  class: "form-control",
                  type: "text",
                  readonly: "",
                  value: data.quantity,
                  min: "1",
                  onInput: "$(this).qtInput(" + index + ")",
                }),
                $("<span>", { class: "input-group-btn" }).append(
                  $("<button>", {
                    class: "btn btn-light",
                    onclick: "$(this).qtIncrement(" + index + ")",
                  }).append($("<i>", { class: "fa fa-plus" })),
                ),
              ),
            ),
            $("<div>", {
              class: "col-md-3",
              text:
                validator.unescape(settings.symbol) +
                moneyFormat((data.price * data.quantity).toFixed(2)),
            }),
            $("<div>", { class: "col-md-1" }).append(
              $("<button>", {
                class: "btn btn-light btn-xs",
                onclick: "$(this).deleteFromCart(" + index + ")",
              }).append($("<i>", { class: "fa fa-times" })),
            ),
          ),
        );
      });
    };

    $.fn.deleteFromCart = function (index) {
      cart.splice(index, 1);
      $(this).renderTable(cart);
    };

    $.fn.qtIncrement = function (i) {
      item = cart[i];
      let product = allProducts.filter(function (selected) {
        return selected._id == parseInt(item.id);
      });

      if (product[0].stock == 1) {
        if (item.quantity < product[0].quantity) {
          item.quantity = parseInt(item.quantity) + 1;
          $(this).renderTable(cart);
        } else {
          notiflix.Report.info(
            "No more stock!",
            "You have already added all the available stock.",
            "Ok",
          );
        }
      } else {
        item.quantity = parseInt(item.quantity) + 1;
        $(this).renderTable(cart);
      }
    };

    $.fn.qtDecrement = function (i) {
      if (item.quantity > 1) {
        item = cart[i];
        item.quantity = parseInt(item.quantity) - 1;
        $(this).renderTable(cart);
      }
    };

    $.fn.qtInput = function (i) {
      item = cart[i];
      item.quantity = $(this).val();
      $(this).renderTable(cart);
    };

    $.fn.cancelOrder = function () {
      if (cart.length > 0) {
        const diagOptions = {
          title: "Are you sure?",
          text: "You are about to remove all items from the cart.",
          icon: "warning",
          showCancelButton: true,
          okButtonText: "Yes, clear it!",
          cancelButtonText: "Cancel",
          options: {
            // okButtonBackground: "#3085d6",
            cancelButtonBackground: "#d33",
          },
        };

        notiflix.Confirm.show(
          diagOptions.title,
          diagOptions.text,
          diagOptions.okButtonText,
          diagOptions.cancelButtonText,
          () => {
            cart = [];
            clearConsultationCharge();
            $(this).renderTable(cart);
            holdOrder = 0;
            notiflix.Report.success(
              "Cleared!",
              "All items have been removed.",
              "Ok",
            );
          },
          "",
          diagOptions.options,
        );
      }
    };

    $("#payButton").on("click", function () {
      if (cart.length != 0 || consultationFeeValue() > 0) {
        if (settings && settings.quick_billing) {
          const payableAmount = $("#payablePrice").val().replace(/,/g, "");
          $("#payment").val(payableAmount);
          $("#paymentText").val(moneyFormat(payableAmount));
          $("#payment").trigger("input");
          $(this).submitDueOrder(1);
        } else {
          $("#paymentModel").modal("toggle");
        }
      } else {
        notiflix.Report.warning("Oops!", "There is nothing to pay!", "Ok");
      }
    });

    $("#hold").on("click", function () {
      if (cart.length != 0) {
        $("#dueModal").modal("toggle");
      } else {
        notiflix.Report.warning("Oops!", "There is nothing to hold!", "Ok");
      }
    });

    function printJobComplete() {
      notiflix.Report.success("Done", "print job complete", "Ok");
    }

    $.fn.submitDueOrder = function (status) {
      let items = "";
      let payment = 0;
      paymentType = $(".list-group-item.active").data("payment-type");
      cart.forEach((item) => {
        items += `<tr><td>${DOMPurify.sanitize(item.product_name)}</td><td>${DOMPurify.sanitize(
          item.quantity,
        )} </td><td class="text-right"> ${DOMPurify.sanitize(validator.unescape(settings.symbol))} ${moneyFormat(
          DOMPurify.sanitize(Math.abs(item.price).toFixed(2)),
        )} </td></tr>`;
      });

      const consultation = consultationFeeValue();
      if (consultation > 0) {
        items += `<tr><td>Consultation Fee${consultationPatient && consultationPatient.name ? ` - ${DOMPurify.sanitize(consultationPatient.name)}` : ""}</td><td>1</td><td class="text-right">${validator.unescape(settings.symbol)} ${moneyFormat(
          consultation.toFixed(2),
        )}</td></tr>`;
      }

      let currentTime = new Date(moment());
      let discount = $("#inputDiscount").val();
      let customer = JSON.parse($("#customer").val());
      let date = moment(currentTime).format("YYYY-MM-DD HH:mm:ss");
      let paymentAmount = $("#payment").val().replace(",", "");
      let changeAmount = $("#change").text().replace(",", "");
      let paid =
        $("#payment").val() == "" ? "" : parseFloat(paymentAmount).toFixed(2);
      let change =
        $("#change").text() == "" ? "" : parseFloat(changeAmount).toFixed(2);
      let refNumber = $("#refNumber").val();
      let orderNumber = holdOrder;
      let type = "";
      let tax_row = "";
      switch (paymentType) {
        case 1:
          type = "Cash";
          break;
        case 3:
          type = "Card";
          break;
        case 4:
          type = "Mpesa";
          break;
      }

      if (paid != "") {
        payment = `<tr>
                        <td>Paid</td>
                        <td>:</td>
                        <td class="text-right">${validator.unescape(settings.symbol)} ${moneyFormat(
                          Math.abs(paid).toFixed(2),
                        )}</td>
                    </tr>
                    <tr>
                        <td>Change</td>
                        <td>:</td>
                        <td class="text-right">${validator.unescape(settings.symbol)} ${moneyFormat(
                          Math.abs(change).toFixed(2),
                        )}</td>
                    </tr>
                    <tr>
                        <td>Method</td>
                        <td>:</td>
                        <td class="text-right">${type}</td>
                    </tr>`;
      }

      if (settings.charge_tax) {
        tax_row = `<tr>
                    <td>VAT(${validator.unescape(settings.percentage)})% </td>
                    <td>:</td>
                    <td class="text-right">${validator.unescape(settings.symbol)} ${moneyFormat(
                      parseFloat(totalVat).toFixed(2),
                    )}</td>
                </tr>`;
      }

      if (status == 0) {
        if (cart.length == 0 && consultation <= 0) {
          notiflix.Report.warning(
            "Nothing to charge",
            "Add medicine to the cart or select a patient with a consultation fee.",
            "Ok",
          );
          return;
        }

        if ($("#customer").val() == 0 && $("#refNumber").val() == "") {
          notiflix.Report.warning(
            "Reference Required!",
            "You either need to select a customer <br> or enter a reference!",
            "Ok",
          );
          return;
        }
      }

      $(".loading").show();

      if (holdOrder != 0) {
        orderNumber = holdOrder;
        method = "PUT";
      } else {
        orderNumber = Math.floor(Date.now() / 1000);
        method = "POST";
      }

      logo = path.join(img_path, validator.unescape(settings.img));

      receipt = `<div style="font-size: 10px">                            
        <p style="text-align: center;">
        ${
          checkFileExists(logo)
            ? `<img style='max-width: 50px' src='${logo}' /><br>`
            : ``
        }
            <span style="font-size: 22px;">${validator.unescape(settings.store)}</span> <br>
            ${validator.unescape(settings.address_one)} <br>
            ${validator.unescape(settings.address_two)} <br>
            ${
              validator.unescape(settings.contact) != ""
                ? "Tel: " + validator.unescape(settings.contact) + "<br>"
                : ""
            } 
            ${validator.unescape(settings.tax) != "" ? "Vat No: " + validator.unescape(settings.tax) + "<br>" : ""} 
        </p>
        <hr>
        <left>
            <p>
            Order No : ${orderNumber} <br>
            Ref No : ${refNumber == "" ? orderNumber : _.escape(refNumber)} <br>
            Customer : ${
              customer == 0 ? "Walk in customer" : _.escape(customer.name)
            } <br>
            Cashier : ${user.fullname} <br>
            Date : ${date}<br>
            </p>

        </left>
        <hr>
        <table width="90%">
            <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th class="text-right">Price</th>
            </tr>
            </thead>
            <tbody>
             ${items}                
            <tr><td colspan="3"><hr></td></tr>
            <tr>                        
                <td><b>Subtotal</b></td>
                <td>:</td>
                <td class="text-right"><b>${validator.unescape(settings.symbol)}${moneyFormat(
                  subTotal.toFixed(2),
                )}</b></td>
            </tr>
            <tr>
                <td>Discount</td>
                <td>:</td>
                <td class="text-right">${
                  discount > 0
                    ? validator.unescape(settings.symbol) +
                      moneyFormat(parseFloat(discount).toFixed(2))
                    : ""
                }</td>
            </tr>
            ${tax_row}
            <tr>
                <td><h5>Total</h5></td>
                <td><h5>:</h5></td>
                <td class="text-right">
                    <h5>${validator.unescape(settings.symbol)} ${moneyFormat(
                      parseFloat(orderTotal).toFixed(2),
                    )}</h3>
                </td>
            </tr>
            ${payment == 0 ? "" : payment}
            </tbody>
            </table>
            <br>
            <hr>
            <br>
            <p style="text-align: center;">
             ${validator.unescape(settings.footer)}
             </p>
            </div>`;

      if (status == 3) {
        if (cart.length > 0 || consultation > 0) {
          printJS({ printable: receipt, type: "raw-html" });

          $(".loading").hide();
          return;
        } else {
          $(".loading").hide();
          return;
        }
      }

      let data = {
        order: orderNumber,
        ref_number: refNumber,
        discount: discount,
        customer: customer,
        status: status,
        subtotal: parseFloat(subTotal).toFixed(2),
        tax: totalVat,
        order_type: 1,
        items: cart,
        date: currentTime,
        payment_type: type,
        payment_info: $("#paymentInfo").val(),
        consultation_fee: consultation,
        total: orderTotal,
        paid: paid,
        change: change,
        _id: orderNumber,
        till: platform.till,
        mac: platform.mac,
        user: user.fullname,
        user_id: user._id,
      };

      $.ajax({
        url: api + "new",
        type: method,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        cache: false,
        processData: false,
        success: function (data) {
          cart = [];
          clearConsultationCharge();
          receipt = DOMPurify.sanitize(receipt, {
            ALLOW_UNKNOWN_PROTOCOLS: true,
          });
          $("#viewTransaction").html("");
          $("#viewTransaction").html(receipt);
          $("#orderModal").modal("show");
          loadProducts();
          loadCustomers();
          $(".loading").hide();
          $("#dueModal").modal("hide");
          $("#paymentModel").modal("hide");
          $(this).getHoldOrders();
          $(this).getCustomerOrders();
          $(this).renderTable(cart);
        },

        error: function (data) {
          $(".loading").hide();
          $("#dueModal").modal("toggle");
          notiflix.Report.failure(
            "Something went wrong!",
            "Please refresh this page and try again",
            "Ok",
          );
        },
      });

      $("#refNumber").val("");
      $("#change").text("");
      $("#payment,#paymentText").val("");
    };

    $.get(api + "on-hold", function (data) {
      holdOrderList = data;
      holdOrderlocation.empty();
      // clearInterval(dotInterval);
      $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1);
    });

    $.fn.getHoldOrders = function () {
      $.get(api + "on-hold", function (data) {
        holdOrderList = data;
        clearInterval(dotInterval);
        holdOrderlocation.empty();
        $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1);
      });
    };

    $.fn.renderHoldOrders = function (data, renderLocation, orderType) {
      $.each(data, function (index, order) {
        $(this).calculatePrice(order);
        renderLocation.append(
          $("<div>", {
            class:
              orderType == 1 ? "col-md-3 order" : "col-md-3 customer-order",
          }).append(
            $("<a>").append(
              $("<div>", { class: "card-box order-box" }).append(
                $("<p>").append(
                  $("<b>", { text: "Ref :" }),
                  $("<span>", { text: order.ref_number, class: "ref_number" }),
                  $("<br>"),
                  $("<b>", { text: "Price :" }),
                  $("<span>", {
                    text: order.total,
                    class: "label label-info",
                    style: "font-size:14px;",
                  }),
                  $("<br>"),
                  $("<b>", { text: "Items :" }),
                  $("<span>", { text: order.items.length }),
                  $("<br>"),
                  $("<b>", { text: "Customer :" }),
                  $("<span>", {
                    text:
                      order.customer != 0
                        ? order.customer.name
                        : "Walk in customer",
                    class: "customer_name",
                  }),
                ),
                $("<button>", {
                  class: "btn btn-danger del",
                  onclick:
                    "$(this).deleteOrder(" + index + "," + orderType + ")",
                }).append($("<i>", { class: "fa fa-trash" })),

                $("<button>", {
                  class: "btn btn-default",
                  onclick:
                    "$(this).orderDetails(" + index + "," + orderType + ")",
                }).append($("<span>", { class: "fa fa-shopping-basket" })),

                $("<button>", {
                  class: "btn btn-success",
                  title: "Mark as paid",
                  onclick: "$(this).payOrder(" + index + "," + orderType + ")",
                }).append($("<span>", { class: "fa fa-money" })),
              ),
            ),
          ),
        );
      });
    };

    $.fn.calculatePrice = function (data) {
      totalPrice = 0;
      $.each(data.products, function (index, product) {
        totalPrice += product.price * product.quantity;
      });

      let vat = (totalPrice * data.vat) / 100;
      totalPrice = (totalPrice + vat - data.discount).toFixed(0);

      return totalPrice;
    };

    $.fn.orderDetails = function (index, orderType) {
      $("#refNumber").val("");

      const selectCustomerOption = (customerData) => {
        $("#customer option:selected").removeAttr("selected");

        if (customerData && customerData !== 0) {
          let selected = false;

          $("#customer option").each(function () {
            let optionValue = null;
            try {
              optionValue = JSON.parse($(this).val());
            } catch (e) {
              optionValue = null;
            }

            if (optionValue && optionValue.id == customerData.id) {
              $(this).prop("selected", true);
              selected = true;
              return false;
            }
          });

          if (!selected && customerData.name) {
            $("#customer option")
              .filter(function () {
                return $(this).text() == customerData.name;
              })
              .first()
              .prop("selected", true);

            selected = $("#customer option:selected").length > 0;
          }

          if (!selected) {
            $("#customer option")
              .filter(function () {
                return $(this).text() == "Walk in customer";
              })
              .prop("selected", true);
          }
        } else {
          $("#customer option")
            .filter(function () {
              return $(this).text() == "Walk in customer";
            })
            .prop("selected", true);
        }
      };

      if (orderType == 1) {
        $("#refNumber").val(holdOrderList[index].ref_number);
        selectCustomerOption(holdOrderList[index].customer);

        holdOrder = holdOrderList[index]._id;
        cart = [];
        $.each(holdOrderList[index].items, function (index, product) {
          item = {
            id: product.id,
            product_name: product.product_name,
            sku: product.sku,
            price: product.price,
            quantity: product.quantity,
          };
          cart.push(item);
        });
      } else if (orderType == 2) {
        $("#refNumber").val("");
        selectCustomerOption(customerOrderList[index].customer);

        holdOrder = customerOrderList[index]._id;
        cart = [];
        $.each(customerOrderList[index].items, function (index, product) {
          item = {
            id: product.id,
            product_name: product.product_name,
            sku: product.sku,
            price: product.price,
            quantity: product.quantity,
          };
          cart.push(item);
        });
      }
      $(this).renderTable(cart);
      $("#holdOrdersModal").modal("hide");
      $("#customerModal").modal("hide");
    };

    $.fn.payOrder = function (index, orderType) {
      $(this).orderDetails(index, orderType);
      $("#paymentModel").modal("show");
    };

    $.fn.deleteOrder = function (index, type) {
      switch (type) {
        case 1:
          deleteId = holdOrderList[index]._id;
          break;
        case 2:
          deleteId = customerOrderList[index]._id;
      }

      let data = {
        orderId: deleteId,
      };
      let diagOptions = {
        title: "Delete order?",
        text: "This will delete the order. Are you sure you want to delete!",
        icon: "warning",
        showCancelButton: true,
        okButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        okButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "delete",
            type: "POST",
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            cache: false,
            success: function (data) {
              $(this).getHoldOrders();
              $(this).getCustomerOrders();

              notiflix.Report.success(
                "Deleted!",
                "You have deleted the order!",
                "Ok",
              );
            },
            error: function (data) {
              $(".loading").hide();
            },
          });
        },
      );
    };

    $.fn.getCustomerOrders = function () {
      $.get(api + "customer-orders", function (data) {
        //clearInterval(dotInterval);
        customerOrderList = data;
        customerOrderLocation.empty();
        $(this).renderHoldOrders(customerOrderList, customerOrderLocation, 2);
      });
    };

    function getSelectedCustomerData() {
      const selected = $("#customer").val();
      if (!selected || selected == 0) {
        return null;
      }

      try {
        return JSON.parse(selected);
      } catch (e) {
        return null;
      }
    }

    $("#newCustomerModal").on("click", function () {
      $("#saveCustomer").get(0).reset();
      $("#customer_id").val("");
      $("#customerModalTitle").text("New Customer");
      $("#saveCustomerBtn").val("Save Customer");
    });

    $("#newPatientModal").on("click", function () {
      $("#saveCustomer").get(0).reset();
      $("#customer_id").val("");
      $("#customerModalTitle").text("New Patient");
      $("#saveCustomerBtn").val("Save Patient");
      $("#Patients").modal("hide");
      $("#newCustomer").modal("show");
    });

    $("#editCustomerModal").on("click", function () {
      const selectedCustomer = getSelectedCustomerData();

      if (!selectedCustomer || !selectedCustomer.id) {
        notiflix.Report.warning(
          "Customer required",
          "Please select a customer to edit.",
          "Ok",
        );
        return;
      }

      $.get(
        api + "customers/customer/" + selectedCustomer.id,
        function (customer) {
          if (!customer) {
            notiflix.Report.warning(
              "Not found",
              "Could not load selected customer details.",
              "Ok",
            );
            return;
          }

          $("#customer_id").val(customer._id);
          $("#userName").val(customer.name || "");
          $("#phoneNumber").val(customer.phone || "");
          $("#emailAddress").val(customer.email || "");
          $("#userAddress").val(customer.address || "");
          $("#diagnosis").val(customer.diagnosis || "");
          $("#feeling").val(customer.feeling || "");
          $("#medicine_given").val(customer.medicine_given || "");
          $("#consultation_done").prop("checked", !!customer.consultation_done);
          $("#consultation_fee").val(customer.consultation_fee || "");
          $("#customerModalTitle").text("Edit Customer");
          $("#saveCustomerBtn").val("Update Customer");
          $("#newCustomer").modal("show");
        },
      );
    });

    $("#saveCustomer").on("submit", function (e) {
      e.preventDefault();

      const customerId = $("#customer_id").val();
      let custData = {
        _id:
          customerId != ""
            ? parseInt(customerId)
            : Math.floor(Date.now() / 1000),
        name: $("#userName").val(),
        phone: $("#phoneNumber").val(),
        email: $("#emailAddress").val(),
        address: $("#userAddress").val(),
        diagnosis: $("#diagnosis").val(),
        feeling: $("#feeling").val(),
        medicine_given: $("#medicine_given").val(),
        consultation_done: $("#consultation_done").is(":checked"),
        consultation_fee: $("#consultation_fee").val(),
      };

      const requestType = customerId != "" ? "PUT" : "POST";
      const successMessage =
        customerId != ""
          ? "Customer updated successfully!"
          : "Customer added successfully!";

      $.ajax({
        url: api + "customers/customer",
        type: requestType,
        data: JSON.stringify(custData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        processData: false,
        success: function (data) {
          $("#newCustomer").modal("hide");
          notiflix.Report.success("Success", successMessage, "Ok");
          loadCustomers();

          setTimeout(function () {
            $("#customer")
              .val(
                JSON.stringify({
                  id: custData._id,
                  name: custData.name,
                  phone: custData.phone || "",
                  email: custData.email || "",
                  address: custData.address || "",
                  diagnosis: custData.diagnosis || "",
                  feeling: custData.feeling || "",
                  medicine_given: custData.medicine_given || "",
                  consultation_done: !!custData.consultation_done,
                  consultation_fee: custData.consultation_fee || 0,
                }),
              )
              .trigger("chosen:updated");
          }, 100);
        },
        error: function (data) {
          $("#newCustomer").modal("hide");
          notiflix.Report.failure(
            "Error",
            "Something went wrong please try again",
            "Ok",
          );
        },
      });
    });

    $("#confirmPayment").hide();

    $("#cardInfo").hide();

    $("#payment").on("input", function () {
      $(this).calculateChange();
    });
    $("#confirmPayment").on("click", function () {
      if ($("#payment").val() == "") {
        notiflix.Report.warning(
          "Nope!",
          "Please enter the amount that was paid!",
          "Ok",
        );
      } else {
        $(this).submitDueOrder(1);
      }
    });

    $("#transactions").on("click", function () {
      loadTransactions();
      loadUserList();

      $("#pos_view").hide();
      $("#pointofsale").show();
      $("#transactions_view").show();
      $(this).hide();
    });

    $("#pointofsale").on("click", function () {
      $("#pos_view").show();
      $("#transactions").show();
      $("#transactions_view").hide();
      $(this).hide();
    });

    $("#viewRefOrders").on("click", function () {
      setTimeout(function () {
        $("#holdOrderInput").focus();
      }, 500);
    });

    $("#viewCustomerOrders").on("click", function () {
      setTimeout(function () {
        $("#holdCustomerOrderInput").focus();
      }, 500);
    });

    $("#newProductModal").on("click", function () {
      $("#saveProduct").get(0).reset();
      $("#current_img").text("");
    });

    $("#saveProduct").submit(function (e) {
      e.preventDefault();

      $(this).attr("action", api + "inventory/product");
      $(this).attr("method", "POST");

      $(this).ajaxSubmit({
        contentType: "application/json",
        success: function (response) {
          $("#saveProduct").get(0).reset();
          $("#current_img").text("");

          loadProducts();
          diagOptions = {
            title: "Product Saved",
            text: "Select an option below to continue.",
            okButtonText: "Add another",
            cancelButtonText: "Close",
          };

          notiflix.Confirm.show(
            diagOptions.title,
            diagOptions.text,
            diagOptions.okButtonText,
            diagOptions.cancelButtonText,
            () => {},
            () => {
              $("#newProduct").modal("hide");
            },
          );
        },
        //error for product
        error: function (jqXHR, textStatus, errorThrown) {
          console.error(jqXHR.responseJSON.message);
          notiflix.Report.failure(
            jqXHR.responseJSON.error,
            jqXHR.responseJSON.message,
            "Ok",
          );
        },
      });
    });

    $("#saveCategory").submit(function (e) {
      e.preventDefault();

      if ($("#category_id").val() == "") {
        method = "POST";
      } else {
        method = "PUT";
      }

      $.ajax({
        type: method,
        url: api + "categories/category",
        data: $(this).serialize(),
        success: function (data, textStatus, jqXHR) {
          $("#saveCategory").get(0).reset();
          loadCategories();
          loadProducts();
          diagOptions = {
            title: "Category Saved",
            text: "Select an option below to continue.",
            okButtonText: "Add another",
            cancelButtonText: "Close",
          };

          notiflix.Confirm.show(
            diagOptions.title,
            diagOptions.text,
            diagOptions.okButtonText,
            diagOptions.cancelButtonText,
            () => {},

            () => {
              $("#newCategory").modal("hide");
            },
          );
        },
      });
    });

    $.fn.editProduct = function (index) {
      $("#Products").modal("hide");

      $("#category option")
        .filter(function () {
          return $(this).val() == allProducts[index].category;
        })
        .prop("selected", true);

      $("#productName").val(allProducts[index].name);
      $("#product_price").val(allProducts[index].price);
      $("#quantity").val(allProducts[index].quantity);
      $("#supplier").val(allProducts[index].supplier || "");
      $("#barcode").val(allProducts[index].barcode || allProducts[index]._id);
      $("#expirationDate").val(allProducts[index].expirationDate);
      $("#minStock").val(allProducts[index].minStock || 1);
      $("#product_id").val(allProducts[index]._id);
      $("#img").val(allProducts[index].img);

      if (allProducts[index].img != "") {
        $("#imagename").hide();
        $("#current_img").html(
          `<img src="${img_path + allProducts[index].img}" alt="">`,
        );
        $("#rmv_img").show();
      }

      if (allProducts[index].stock == 0) {
        $("#stock").prop("checked", true);
      }

      $("#newProduct").modal("show");
    };

    $("#userModal").on("hide.bs.modal", function () {
      $(".perms").hide();
    });

    $.fn.editUser = function (index) {
      user_index = index;

      $("#Users").modal("hide");

      $(".perms").show();

      $("#user_id").val(allUsers[index]._id);
      $("#fullname").val(allUsers[index].fullname);
      $("#username").val(validator.unescape(allUsers[index].username));
      $("#password").attr("placeholder", "New Password");

      for (perm of permissions) {
        var el = "#" + perm;
        if (allUsers[index][perm] == 1) {
          $(el).prop("checked", true);
        } else {
          $(el).prop("checked", false);
        }
      }

      $("#userModal").modal("show");
    };

    $.fn.editCategory = function (index) {
      $("#Categories").modal("hide");
      $("#categoryName").val(allCategories[index].name);
      $("#category_id").val(allCategories[index]._id);
      $("#newCategory").modal("show");
    };

    $.fn.deleteProduct = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this product.",
        okButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "inventory/product/" + id,
            type: "DELETE",
            success: function (result) {
              loadProducts();
              notiflix.Report.success("Done!", "Product deleted", "Ok");
            },
          });
        },
      );
    };

    $.fn.deleteUser = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this user.",
        cancelButtonColor: "#d33",
        okButtonText: "Yes, delete!",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "users/user/" + id,
            type: "DELETE",
            success: function (result) {
              loadUserList();
              notiflix.Report.success("Done!", "User deleted", "Ok");
            },
          });
        },
      );
    };

    $.fn.deleteCategory = function (id) {
      diagOptions = {
        title: "Are you sure?",
        text: "You are about to delete this category.",
        okButtonText: "Yes, delete it!",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.ajax({
            url: api + "categories/category/" + id,
            type: "DELETE",
            success: function (result) {
              loadCategories();
              notiflix.Report.success("Done!", "Category deleted", "Ok");
            },
          });
        },
      );
    };

    $("#productModal").on("click", function () {
      loadProductList();
    });

    $("#usersModal").on("click", function () {
      loadUserList();
    });

    $("#patientsModal").on("click", function () {
      loadPatientList();
    });

    $("#reportsModal").on("click", function () {
      loadStockReport();
      loadPatientReport();
      loadSalesReport(reportStart.toDate(), reportEnd.toDate());
    });

    $("#reportSalesRange").on("apply.daterangepicker", function (ev, picker) {
      reportStart = picker.startDate;
      reportEnd = picker.endDate;
      loadSalesReport(reportStart.toDate(), reportEnd.toDate());
    });

    $("#printSalesReport").on("click", function () {
      printReportSection("salesReportBody", "Sales Report");
    });

    $("#printStockReport").on("click", function () {
      printReportSection("stockReportBody", "Stock & Expiry Report");
    });

    $("#printPatientReport").on("click", function () {
      printReportSection("patientReportBody", "Patient / Dispensing Report");
    });

    $("#categoryModal").on("click", function () {
      loadCategoryList();
    });

    function loadUserList() {
      let counter = 0;
      let user_list = "";
      $("#user_list").empty();
      $("#userList").DataTable().destroy();

      $.get(api + "users/all", function (users) {
        allUsers = [...users];

        users.forEach((user, index) => {
          state = [];
          let class_name = "";

          if (user.status != "") {
            state = user.status.split("_");
            login_status = state[0];
            login_time = state[1];

            switch (login) {
              case "Logged In":
                class_name = "btn-default";

                break;
              case "Logged Out":
                class_name = "btn-light";
                break;
            }
          }

          counter++;
          user_list += `<tr>
            <td>${user.fullname}</td>
            <td>${user.username}</td>
            <td class="${class_name}">${
              state.length > 0 ? login_status : ""
            } <br><small> ${state.length > 0 ? login_time : ""}</small></td>
            <td>${
              user._id == 1
                ? '<span class="btn-group"><button class="btn btn-dark"><i class="fa fa-edit"></i></button><button class="btn btn-dark"><i class="fa fa-trash"></i></button></span>'
                : '<span class="btn-group"><button onClick="$(this).editUser(' +
                  index +
                  ')" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteUser(' +
                  user._id +
                  ')" class="btn btn-danger"><i class="fa fa-trash"></i></button></span>'
            }</td></tr>`;

          if (counter == users.length) {
            $("#user_list").html(user_list);

            $("#userList").DataTable({
              order: [[1, "desc"]],
              autoWidth: false,
              info: true,
              JQueryUI: true,
              ordering: true,
              paging: false,
            });
          }
        });
      });
    }

    function loadProductList() {
      let products = [...allProducts];
      let product_list = "";
      let counter = 0;
      $("#product_list").empty();
      $("#productList").DataTable().destroy();

      products.forEach((product, index) => {
        counter++;

        let category = allCategories.filter(function (category) {
          return category._id == product.category;
        });

        product.stockAlert = "";
        const todayDate = moment();
        const expiryDate = moment(product.expirationDate, DATE_FORMAT);

        //show stock status indicator
        const stockStatus = getStockStatus(product.quantity, product.minStock);
        if (stockStatus <= 0) {
          if (stockStatus === 0) {
            product.stockStatus = "No Stock";
            icon = "fa fa-exclamation-triangle";
          }
          if (stockStatus === -1) {
            product.stockStatus = "Low Stock";
            icon = "fa fa-caret-down";
          }

          product.stockAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.stockStatus}</small></p>`;
        }
        //calculate days to expiry
        product.expiryAlert = "";
        if (!isExpired(expiryDate)) {
          const diffDays = daysToExpire(expiryDate);

          if (diffDays > 0 && diffDays <= 30) {
            var days_noun = diffDays > 1 ? "days" : "day";
            icon = "fa fa-clock-o";
            product.expiryStatus = `${diffDays} ${days_noun} left`;
            product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
          }
        } else {
          icon = "fa fa-exclamation-triangle";
          product.expiryStatus = "Expired";
          product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
        }

        if (product.img === "") {
          product_img = default_item_img;
        } else {
          product_img = img_path + product.img;
          product_img = checkFileExists(product_img)
            ? product_img
            : default_item_img;
        }

        //render product list
        product_list +=
          `<tr>
            <td><img id="` +
          product._id +
          `"></td>
            <td><img style="max-height: 50px; max-width: 50px; border: 1px solid #ddd;" src="${product_img}" id="product_img"></td>
            <td>${product.name}
            ${product.expiryAlert}</td>
            <td>${validator.unescape(settings.symbol)}${product.price}</td>
            <td>${product.stock == 1 ? product.quantity : "N/A"}
            ${product.stockAlert}
            </td>
            <td>${product.expirationDate}</td>
            <td>${category.length > 0 ? category[0].name : ""}</td>
            <td>${product.supplier || ""}</td>
            <td class="nobr"><span class="btn-group"><button onClick="$(this).editProduct(${index})" class="btn btn-warning btn-sm"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteProduct(${
              product._id
            })" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button></span></td></tr>`;

        if (counter == allProducts.length) {
          $("#product_list").html(product_list);

          products.forEach((product) => {
            let bcode = product.barcode || product._id;
            $("#" + product._id + "").JsBarcode(bcode, {
              width: 2,
              height: 25,
              fontSize: 14,
            });
          });
        }
      });

      $("#productList").DataTable({
        order: [[1, "desc"]],
        autoWidth: false,
        info: true,
        JQueryUI: true,
        ordering: true,
        paging: false,
        dom: "Bfrtip",
        buttons: [
          {
            extend: "pdfHtml5",
            className: "btn btn-light", // Custom class name
            text: " Download PDF", // Custom text
            filename: "product_list.pdf", // Default filename
          },
        ],
      });
    }

    function loadCategoryList() {
      let category_list = "";
      let counter = 0;
      $("#category_list").empty();
      $("#categoryList").DataTable().destroy();

      allCategories.forEach((category, index) => {
        counter++;

        category_list += `<tr>
     
            <td>${category.name}</td>
            <td><span class="btn-group"><button onClick="$(this).editCategory(${index})" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteCategory(${category._id})" class="btn btn-danger"><i class="fa fa-trash"></i></button></span></td></tr>`;
      });

      if (counter == allCategories.length) {
        $("#category_list").html(category_list);
        $("#categoryList").DataTable({
          autoWidth: false,
          info: true,
          JQueryUI: true,
          ordering: true,
          paging: false,
        });
      }
    }

    $("#log-out").on("click", function () {
      const diagOptions = {
        title: "Are you sure?",
        text: "You are about to log out.",
        cancelButtonColor: "#3085d6",
        okButtonText: "Logout",
      };

      notiflix.Confirm.show(
        diagOptions.title,
        diagOptions.text,
        diagOptions.okButtonText,
        diagOptions.cancelButtonText,
        () => {
          $.get(api + "users/logout/" + user._id, function (data) {
            storage.delete("auth");
            storage.delete("user");
            ipcRenderer.send("app-reload", "");
          });
        },
      );
    });

    $("#settings_form").on("submit", function (e) {
      e.preventDefault();
      let formData = $(this).serializeObject();
      let mac_address;

      api = "http://" + host + ":" + port + "/api/";

      macaddress.one(function (err, mac) {
        mac_address = mac;
      });
      const appChoice = $("#app").find("option:selected").text();

      formData["app"] = appChoice;
      formData["mac"] = mac_address;
      formData["till"] = 1;

      // Update application field in settings form
      let $appField = $("#settings_form input[name='app']");
      let $hiddenAppField = $("<input>", {
        type: "hidden",
        name: "app",
        value: formData.app,
      });
      $appField.length
        ? $appField.val(formData.app)
        : $("#settings_form").append(
            `<input type="hidden" name="app" value="${$hiddenAppField}" />`,
          );

      if (
        formData.percentage != "" &&
        typeof formData.percentage === "number"
      ) {
        notiflix.Report.warning(
          "Oops!",
          "Please make sure the tax value is a number",
          "Ok",
        );
      } else {
        storage.set("settings", formData);

        $(this).attr("action", api + "settings/post");
        $(this).attr("method", "POST");

        $(this).ajaxSubmit({
          contentType: "application/json",
          success: function () {
            ipcRenderer.send("app-reload", "");
          },
          error: function (jqXHR) {
            console.error(jqXHR.responseJSON.message);
            notiflix.Report.failure(
              jqXHR.responseJSON.error,
              jqXHR.responseJSON.message,
              "Ok",
            );
          },
        });
      }
    });

    $("#net_settings_form").on("submit", function (e) {
      e.preventDefault();
      let formData = $(this).serializeObject();

      if (formData.till == 0 || formData.till == 1) {
        notiflix.Report.warning(
          "Oops!",
          "Please enter a number greater than 1.",
          "Ok",
        );
      } else {
        if (isNumeric(formData.till)) {
          formData["app"] = $("#app").find("option:selected").text();
          formData["port"] = port;
          storage.set("settings", formData);
          ipcRenderer.send("app-reload", "");
        } else {
          notiflix.Report.warning(
            "Oops!",
            "Till number must be a number!",
            "Ok",
          );
        }
      }
    });

    $("#saveUser").on("submit", function (e) {
      e.preventDefault();
      let formData = $(this).serializeObject();

      if (formData.password != formData.pass) {
        notiflix.Report.warning("Oops!", "Passwords do not match!", "Ok");
      }

      if (
        bcrypt.compare(formData.password, user.password) ||
        bcrypt.compare(formData.password, allUsers[user_index].password)
      ) {
        $.ajax({
          url: api + "users/post",
          type: "POST",
          data: JSON.stringify(formData),
          contentType: "application/json; charset=utf-8",
          cache: false,
          processData: false,
          success: function (data) {
            if (ownUserEdit) {
              ipcRenderer.send("app-reload", "");
            } else {
              $("#userModal").modal("hide");

              loadUserList();

              $("#Users").modal("show");
              notiflix.Report.success("Great!", "User details saved!", "Ok");
            }
          },
          error: function (jqXHR, textStatus, errorThrown) {
            notiflix.Report.failure(
              jqXHR.responseJSON.error,
              jqXHR.responseJSON.message,
              "Ok",
            );
          },
        });
      }
    });

    $("#app").on("change", function () {
      if (
        $(this).find("option:selected").text() ==
        "Network Point of Sale Terminal"
      ) {
        $("#net_settings_form").show(500);
        $("#settings_form").hide(500);
        macaddress.one(function (err, mac) {
          $("#mac").val(mac);
        });
      } else {
        $("#net_settings_form").hide(500);
        $("#settings_form").show(500);
      }
    });

    $("#cashier").on("click", function () {
      ownUserEdit = true;

      $("#userModal").modal("show");

      $("#user_id").val(user._id);
      $("#fullname").val(user.fullname);
      $("#username").val(user.username);
      $("#password").attr("placeholder", "New Password");

      for (perm of permissions) {
        var el = "#" + perm;
        if (allUsers[index][perm] == 1) {
          $(el).prop("checked", true);
        } else {
          $(el).prop("checked", false);
        }
      }
    });

    $("#add-user").on("click", function () {
      if (platform.app != "Network Point of Sale Terminal") {
        $(".perms").show();
      }

      $("#saveUser").get(0).reset();
      $("#userModal").modal("show");
    });

    $("#settings").on("click", function () {
      if (platform.app == "Network Point of Sale Terminal") {
        $("#net_settings_form").show(500);
        $("#settings_form").hide(500);

        $("#ip").val(platform.ip);
        $("#till").val(platform.till);
        if (platform.port) {
          port = platform.port;
        }

        macaddress.one(function (err, mac) {
          $("#mac").val(mac);
        });

        $("#app option")
          .filter(function () {
            return $(this).text() == platform.app;
          })
          .prop("selected", true);
      } else {
        $("#net_settings_form").hide(500);
        $("#settings_form").show(500);

        $("#settings_id").val("1");
        $("#store").val(validator.unescape(settings.store));
        $("#address_one").val(validator.unescape(settings.address_one));
        $("#address_two").val(validator.unescape(settings.address_two));
        $("#contact").val(validator.unescape(settings.contact));
        $("#tax").val(validator.unescape(settings.tax));
        $("#symbol").val(validator.unescape(settings.symbol));
        $("#percentage").val(validator.unescape(settings.percentage));
        $("#footer").val(validator.unescape(settings.footer));
        $("#logo_img").val(validator.unescape(settings.img));
        if (settings.charge_tax) {
          $("#charge_tax").prop("checked", true);
        } else {
          $("#charge_tax").prop("checked", false);
        }

        if (settings.quick_billing) {
          $("#quick_billing").prop("checked", true);
        } else {
          $("#quick_billing").prop("checked", false);
        }
        if (validator.unescape(settings.img) != "") {
          $("#logoname").hide();
          $("#current_logo").html(
            `<img src="${img_path + validator.unescape(settings.img)}" alt="">`,
          );
          $("#rmv_logo").show();
        }

        $("#app option")
          .filter(function () {
            return $(this).text() == validator.unescape(settings.app);
          })
          .prop("selected", true);
      }
    });
  });

  $("#rmv_logo").on("click", function () {
    $("#remove_logo").val("1");
    // $("#logo_img").val('');
    $("#current_logo").hide(500);
    $(this).hide(500);
    $("#logoname").show(500);
  });

  $("#rmv_img").on("click", function () {
    $("#remove_img").val("1");
    // $("#img").val('');
    $("#current_img").hide(500);
    $(this).hide(500);
    $("#imagename").show(500);
  });
}

$.fn.print = function () {
  printJS({ printable: receipt, type: "raw-html" });
};

function loadTransactions() {
  let tills = [];
  let users = [];
  let sales = 0;
  let transact = 0;
  let unique = 0;
  let dailySales = {};

  sold_items = [];
  sold = [];

  let counter = 0;
  let transaction_list = "";
  let query = `by-date?start=${start_date}&end=${end_date}&user=${by_user}&status=${by_status}&till=${by_till}`;

  $.get(api + query, function (transactions) {
    if (transactions.length > 0) {
      $("#transaction_list").empty();
      $("#transactionList").DataTable().destroy();

      allTransactions = [...transactions];

      transactions.forEach((trans, index) => {
        sales += parseFloat(trans.total);
        transact++;

        const dayKey = moment(trans.date).format("YYYY-MM-DD");
        dailySales[dayKey] =
          (dailySales[dayKey] || 0) + parseFloat(trans.total || 0);

        trans.items.forEach((item) => {
          sold_items.push(item);
        });

        if (!tills.includes(trans.till)) {
          tills.push(trans.till);
        }

        if (!users.includes(trans.user_id)) {
          users.push(trans.user_id);
        }

        counter++;
        transaction_list += `<tr>
                                <td>${trans.order}</td>
                                <td class="nobr">${moment(trans.date).format(
                                  "DD-MMM-YYYY HH:mm:ss",
                                )}</td>
                                <td>${
                                  validator.unescape(settings.symbol) +
                                  moneyFormat(trans.total)
                                }</td>
                                <td>${
                                  trans.paid == ""
                                    ? ""
                                    : validator.unescape(settings.symbol) +
                                      moneyFormat(trans.paid)
                                }</td>
                                <td>${
                                  trans.change
                                    ? validator.unescape(settings.symbol) +
                                      moneyFormat(
                                        Math.abs(trans.change).toFixed(2),
                                      )
                                    : ""
                                }</td>
                                <td>${
                                  trans.paid == "" ? "" : trans.payment_type
                                }</td>
                                <td>${trans.till}</td>
                                <td>${trans.user}</td>
                                <td>${
                                  trans.paid == ""
                                    ? '<button class="btn btn-dark"><i class="fa fa-search-plus"></i></button>'
                                    : '<button onClick="$(this).viewTransaction(' +
                                      index +
                                      ')" class="btn btn-info"><i class="fa fa-search-plus"></i></button></td>'
                                }</tr>
                    `;

        if (counter == transactions.length) {
          $("#total_sales #counter").text(
            validator.unescape(settings.symbol) +
              moneyFormat(parseFloat(sales).toFixed(2)),
          );
          $("#total_transactions #counter").text(transact);

          const result = {};

          for (const { product_name, price, quantity, id } of sold_items) {
            if (!result[product_name]) {
              result[product_name] = {
                id: id,
                qty: 0,
                total: 0,
              };
            }

            const lineQty = parseFloat(quantity) || 0;
            const linePrice = parseFloat(price) || 0;

            result[product_name].qty += lineQty;
            result[product_name].total += lineQty * linePrice;
          }

          for (item in result) {
            sold.push({
              id: result[item].id,
              product: item,
              qty: result[item].qty,
              total: result[item].total,
            });
          }

          loadSoldProducts();
          renderSalesChart(dailySales);

          if (by_user == 0 && by_till == 0) {
            userFilter(users);
            tillFilter(tills);
          }

          $("#transaction_list").html(transaction_list);
          $("#transactionList").DataTable({
            order: [[1, "desc"]],
            autoWidth: false,
            info: true,
            JQueryUI: true,
            ordering: true,
            paging: true,
            dom: "Bfrtip",
            buttons: ["csv", "excel", "pdf"],
          });
        }
      });
    } else {
      notiflix.Report.warning(
        "No data!",
        "No transactions available within the selected criteria",
        "Ok",
      );
    }
  });
}

function renderSalesChart(dailySales) {
  const $chart = $("#salesChart");
  if (!$chart.length) {
    return;
  }

  const entries = Object.keys(dailySales)
    .sort()
    .map((date) => ({ date, total: dailySales[date] }));

  if (entries.length === 0) {
    $chart.html(
      '<div class="text-muted">No sales data for the selected range.</div>',
    );
    return;
  }

  const maxTotal = Math.max(...entries.map((entry) => entry.total));
  const chartBars = entries
    .map((entry) => {
      const height =
        maxTotal > 0 ? Math.max((entry.total / maxTotal) * 100, 6) : 6;
      return `<div style="flex: 1; min-width: 72px; text-align: center;">
        <div style="height: 180px; display: flex; align-items: flex-end; justify-content: center; padding: 0 6px;">
          <div title="${entry.date}: ${validator.unescape(settings.symbol)}${moneyFormat(
            parseFloat(entry.total).toFixed(2),
          )}" style="width: 100%; max-width: 48px; height: ${height}%; background: linear-gradient(180deg, #28a745, #1e7e34); border-radius: 8px 8px 0 0;"></div>
        </div>
        <div style="font-size: 11px; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${moment(
          entry.date,
        ).format("DD MMM")}</div>
        <div style="font-size: 12px; font-weight: 600;">${validator.unescape(settings.symbol)}${moneyFormat(
          parseFloat(entry.total).toFixed(2),
        )}</div>
      </div>`;
    })
    .join("");

  $chart.html(
    `<div style="display: flex; gap: 12px; align-items: flex-end; overflow-x: auto; padding-bottom: 8px;">${chartBars}</div>`,
  );
}

function sortDesc(a, b) {
  if (a.qty > b.qty) {
    return -1;
  }
  if (a.qty < b.qty) {
    return 1;
  }
  return 0;
}

function loadSoldProducts() {
  sold.sort(sortDesc);

  let counter = 0;
  let sold_list = "";
  let items = 0;
  let products = 0;
  $("#product_sales").empty();

  sold.forEach((item, index) => {
    items = items + parseInt(item.qty);
    products++;

    let product = allProducts.filter(function (selected) {
      return selected._id == item.id;
    });

    counter++;

    sold_list += `<tr>
            <td>${item.product}</td>
            <td>${item.qty}</td>
            <td>${
              product[0].stock == 1
                ? product.length > 0
                  ? product[0].quantity
                  : ""
                : "N/A"
            }</td>
            <td>${
              validator.unescape(settings.symbol) +
              moneyFormat(parseFloat(item.total || 0).toFixed(2))
            }</td>
            </tr>`;

    if (counter == sold.length) {
      $("#total_items #counter").text(items);
      $("#total_products #counter").text(products);
      $("#product_sales").html(sold_list);
    }
  });
}

function userFilter(users) {
  $("#users").empty();
  $("#users").append(`<option value="0">All</option>`);

  users.forEach((user) => {
    let u = allUsers.filter(function (usr) {
      return usr._id == user;
    });

    $("#users").append(`<option value="${user}">${u[0].fullname}</option>`);
  });
}

function tillFilter(tills) {
  $("#tills").empty();
  $("#tills").append(`<option value="0">All</option>`);
  tills.forEach((till) => {
    $("#tills").append(`<option value="${till}">${till}</option>`);
  });
}

/**
 * Build the Sales report for the selected date range: totals, revenue by
 * payment method (Cash/Card/Mpesa) and the top selling products.
 *
 * @param {Date} startDate - start of the report period.
 * @param {Date} endDate - end of the report period.
 * @returns {void}
 */
function loadSalesReport(startDate, endDate) {
  $("#salesReportBody").html('<p>Please wait <span class="dot"></span></p>');

  $.get(
    api +
      `by-date?start=${startDate.toISOString()}&end=${endDate.toISOString()}&user=0&status=1&till=0`,
    function (transactions) {
      const symbol = settings && settings.symbol ? validator.unescape(settings.symbol) : "";

      if (!transactions || transactions.length === 0) {
        $("#salesReportBody").html(
          '<div class="alert alert-warning">No paid transactions in this period.</div>',
        );
        return;
      }

      let totalSales = 0;
      let totalItems = 0;
      const paymentTotals = {};
      const productTotals = {};

      transactions.forEach((trans) => {
        totalSales += parseFloat(trans.total || 0);
        const method = trans.payment_type || "Unknown";
        paymentTotals[method] =
          (paymentTotals[method] || 0) + parseFloat(trans.total || 0);

        (trans.items || []).forEach((item) => {
          const qty = parseFloat(item.quantity) || 0;
          const linePrice = parseFloat(item.price) || 0;
          totalItems += qty;

          if (!productTotals[item.product_name]) {
            productTotals[item.product_name] = { qty: 0, total: 0 };
          }
          productTotals[item.product_name].qty += qty;
          productTotals[item.product_name].total += qty * linePrice;
        });
      });

      const topProducts = Object.keys(productTotals)
        .map((name) => ({ name, ...productTotals[name] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const paymentRows =
        Object.keys(paymentTotals)
          .map(
            (method) =>
              `<tr><td>${DOMPurify.sanitize(method)}</td><td>${symbol}${moneyFormat(paymentTotals[method].toFixed(2))}</td></tr>`,
          )
          .join("") || '<tr><td colspan="2">No data.</td></tr>';

      const productRows =
        topProducts
          .map(
            (p) =>
              `<tr><td>${DOMPurify.sanitize(p.name || "Unknown")}</td><td>${p.qty}</td><td>${symbol}${moneyFormat(p.total.toFixed(2))}</td></tr>`,
          )
          .join("") || '<tr><td colspan="3">No data.</td></tr>';

      $("#salesReportBody").html(`
        <div class="row text-center m-b-20">
          <div class="col-md-4 py-2 bg-success"><h5>TOTAL SALES</h5><span>${symbol}${moneyFormat(totalSales.toFixed(2))}</span></div>
          <div class="col-md-4 py-2 bg-warning"><h5>TRANSACTIONS</h5><span>${transactions.length}</span></div>
          <div class="col-md-4 py-2 bg-info"><h5>ITEMS SOLD</h5><span>${totalItems}</span></div>
        </div>
        <div class="row">
          <div class="col-md-6">
            <h4>Sales by Payment Method</h4>
            <table class="table table-bordered"><thead><tr><th>Method</th><th>Total</th></tr></thead><tbody>${paymentRows}</tbody></table>
          </div>
          <div class="col-md-6">
            <h4>Top 10 Products by Revenue</h4>
            <table class="table table-bordered"><thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead><tbody>${productRows}</tbody></table>
          </div>
        </div>
      `);
    },
  ).fail(function () {
    $("#salesReportBody").html(
      '<div class="alert alert-danger">Unable to load the sales report right now.</div>',
    );
  });
}

/**
 * Build the Stock & Expiry report: out-of-stock and low-stock items (using
 * the same thresholds as the rest of the app), expired items, items expiring
 * within 30 days, and the total value of current stock.
 *
 * @returns {void}
 */
function loadStockReport() {
  $("#stockReportBody").html('<p>Please wait <span class="dot"></span></p>');

  $.get(api + "inventory/products", function (products) {
    const symbol = settings && settings.symbol ? validator.unescape(settings.symbol) : "";
    const tracked = products.filter((p) => p.stock == 1);
    const outOfStock = tracked.filter(
      (p) => getStockStatus(p.quantity, p.minStock) === 0,
    );
    const lowStock = tracked.filter(
      (p) => getStockStatus(p.quantity, p.minStock) === -1,
    );
    const expired = products.filter((p) => isExpired(p.expirationDate));
    const expiringSoon = products.filter(
      (p) =>
        !isExpired(p.expirationDate) && daysToExpire(p.expirationDate) <= 30,
    );
    const stockValue = tracked.reduce(
      (sum, p) =>
        sum + (parseFloat(p.quantity) || 0) * (parseFloat(p.price) || 0),
      0,
    );
    const stockRows =
      [...outOfStock, ...lowStock]
        .map(
          (p) =>
            `<tr><td>${DOMPurify.sanitize(p.name || "")}</td><td>${DOMPurify.sanitize(p.barcode || "")}</td><td>${p.quantity}</td><td>${p.minStock || 0}</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="4">All stocked items are above minimum levels.</td></tr>';

    const expiryRows =
      [...expired, ...expiringSoon]
        .map(
          (p) =>
            `<tr><td>${DOMPurify.sanitize(p.name || "")}</td><td>${DOMPurify.sanitize(p.barcode || "")}</td><td>${p.expirationDate}</td><td>${
              isExpired(p.expirationDate)
                ? '<span class="text-danger">Expired</span>'
                : daysToExpire(p.expirationDate) + " day(s) left"
            }</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="4">Nothing expired or expiring soon.</td></tr>';

    $("#stockReportBody").html(`
      <div class="row text-center m-b-20">
        <div class="col-md-3 py-2 bg-danger"><h5>OUT OF STOCK</h5><span>${outOfStock.length}</span></div>
        <div class="col-md-3 py-2 bg-warning"><h5>LOW STOCK</h5><span>${lowStock.length}</span></div>
        <div class="col-md-3 py-2 bg-danger"><h5>EXPIRED</h5><span>${expired.length}</span></div>
        <div class="col-md-3 py-2 bg-success"><h5>STOCK VALUE</h5><span>${symbol}${moneyFormat(stockValue.toFixed(2))}</span></div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <h4>Out of Stock / Low Stock</h4>
          <table class="table table-bordered"><thead><tr><th>Product</th><th>Barcode</th><th>Qty</th><th>Min</th></tr></thead><tbody>${stockRows}</tbody></table>
        </div>
        <div class="col-md-6">
          <h4>Expired / Expiring within 30 days</h4>
          <table class="table table-bordered"><thead><tr><th>Product</th><th>Barcode</th><th>Expiry Date</th><th>Status</th></tr></thead><tbody>${expiryRows}</tbody></table>
        </div>
      </div>
    `);
  }).fail(function () {
    $("#stockReportBody").html(
      '<div class="alert alert-danger">Unable to load the stock report right now.</div>',
    );
  });
}

/**
 * Build the Patient / Dispensing report: how many patients are on file, how
 * many consultations were recorded, and the most common diagnoses and
 * dispensed medicines.
 *
 * @returns {void}
 */
function loadPatientReport() {
  $("#patientReportBody").html('<p>Please wait <span class="dot"></span></p>');

  $.get(api + "customers/all", function (patients) {
    const totalPatients = patients.length;
    const consultations = patients.filter((p) => p.consultation_done).length;
    const diagnosisTotals = {};
    const medicineTotals = {};

    patients.forEach((p) => {
      if (p.diagnosis) {
        diagnosisTotals[p.diagnosis] = (diagnosisTotals[p.diagnosis] || 0) + 1;
      }
      if (p.medicine_given) {
        medicineTotals[p.medicine_given] =
          (medicineTotals[p.medicine_given] || 0) + 1;
      }
    });

    const topList = (obj) =>
      Object.keys(obj)
        .map((k) => ({ name: k, count: obj[k] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const diagnosisRows =
      topList(diagnosisTotals)
        .map(
          (d) =>
            `<tr><td>${DOMPurify.sanitize(d.name)}</td><td>${d.count}</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="2">No diagnosis data recorded.</td></tr>';

    const medicineRows =
      topList(medicineTotals)
        .map(
          (d) =>
            `<tr><td>${DOMPurify.sanitize(d.name)}</td><td>${d.count}</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="2">No dispensing data recorded.</td></tr>';

    $("#patientReportBody").html(`
      <div class="row text-center m-b-20">
        <div class="col-md-6 py-2 bg-success"><h5>TOTAL PATIENTS</h5><span>${totalPatients}</span></div>
        <div class="col-md-6 py-2 bg-info"><h5>CONSULTATIONS DONE</h5><span>${consultations}</span></div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <h4>Most Common Diagnoses</h4>
          <table class="table table-bordered"><thead><tr><th>Diagnosis</th><th>Patients</th></tr></thead><tbody>${diagnosisRows}</tbody></table>
        </div>
        <div class="col-md-6">
          <h4>Most Dispensed Medicine</h4>
          <table class="table table-bordered"><thead><tr><th>Medicine</th><th>Times Given</th></tr></thead><tbody>${medicineRows}</tbody></table>
        </div>
      </div>
    `);
  });
}

/**
 * Open a plain print-friendly window containing the given report section
 * and trigger the browser/OS print dialog.
 *
 * @param {string} elementId - id of the container to print.
 * @param {string} title - report title shown in the print window.
 * @returns {void}
 */
function printReportSection(elementId, title) {
  const content = document.getElementById(elementId).innerHTML;
  const storeName =
    settings && settings.store
      ? DOMPurify.sanitize(settings.store)
      : "PharmaSpot";
  const printWindow = window.open("", "_blank");

  printWindow.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      h4 { margin-top: 20px; }
      .row { display: flex; flex-wrap: wrap; gap: 10px; }
      .col-md-3, .col-md-4, .col-md-6 { flex: 1; min-width: 150px; text-align: center; padding: 10px; }
      .bg-success { background:#dff0d8; } .bg-warning { background:#fcf8e3; }
      .bg-info { background:#d9edf7; } .bg-danger { background:#f2dede; }
    </style>
    </head><body>
    <h2>${storeName} - ${title}</h2>
    <p>Generated: ${moment().format("DD-MMM-YYYY HH:mm")}</p>
    ${content}
    </body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

$.fn.viewTransaction = function (index) {
  transaction_index = index;

  let discount = allTransactions[index].discount;
  let customer =
    allTransactions[index].customer == 0
      ? "Walk in Customer"
      : allTransactions[index].customer.username;
  let refNumber =
    allTransactions[index].ref_number != ""
      ? allTransactions[index].ref_number
      : allTransactions[index].order;
  let orderNumber = allTransactions[index].order;
  let paymentMethod = "";
  let tax_row = "";
  let items = "";
  let products = allTransactions[index].items;

  products.forEach((item) => {
    items += `<tr><td>${item.product_name}</td><td>${
      item.quantity
    } </td><td class="text-right"> ${validator.unescape(settings.symbol)} ${moneyFormat(
      Math.abs(item.price).toFixed(2),
    )} </td></tr>`;
  });

  paymentMethod = allTransactions[index].payment_type;

  if (allTransactions[index].paid != "") {
    payment = `<tr>
                    <td>Paid</td>
                    <td>:</td>
                    <td class="text-right">${validator.unescape(settings.symbol)} ${moneyFormat(
                      Math.abs(allTransactions[index].paid).toFixed(2),
                    )}</td>
                </tr>
                <tr>
            }).fail(function () {
                    <td class="text-right">${validator.unescape(settings.symbol)} ${moneyFormat(
                      Math.abs(allTransactions[index].change).toFixed(2),
                    )}</td>
                </tr>
                <tr>
                    <td>Method</td>
                    <td>:</td>
                    <td class="text-right">${paymentMethod}</td>
                </tr>`;
  }

  if (settings.charge_tax) {
    tax_row = `<tr>
                <td>Vat(${validator.unescape(settings.percentage)})% </td>
                <td>:</td>
                <td class="text-right">${validator.unescape(settings.symbol)}${parseFloat(
                  allTransactions[index].tax,
                ).toFixed(2)}</td>
            </tr>`;
  }

  logo = path.join(img_path, validator.unescape(settings.img));

  receipt = `<div style="font-size: 10px">                            
        <p style="text-align: center;">
        ${
          checkFileExists(logo)
            ? `<img style='max-width: 50px' src='${logo}' /><br>`
            : ``
        }
            <span style="font-size: 22px;">${validator.unescape(settings.store)}</span> <br>
            ${validator.unescape(settings.address_one)} <br>
            ${validator.unescape(settings.address_two)} <br>
            ${
              validator.unescape(settings.contact) != ""
                ? "Tel: " + validator.unescape(settings.contact) + "<br>"
                : ""
            } 
            ${validator.unescape(settings.tax) != "" ? "Vat No: " + validator.unescape(settings.tax) + "<br>" : ""} 
    </p>
    <hr>
    <left>
        <p>
        Invoice : ${orderNumber} <br>
        Ref No : ${refNumber} <br>
        Customer : ${
          allTransactions[index].customer == 0
            ? "Walk in Customer"
            : allTransactions[index].customer.name
        } <br>
        Cashier : ${allTransactions[index].user} <br>
        Date : ${moment(allTransactions[index].date).format(
          "DD MMM YYYY HH:mm:ss",
        )}<br>
        </p>

    </left>
    <hr>
    <table width="90%">
        <thead>
        <tr>
            <th>Item</th>
            <th>Qty</th>
            <th class="text-right">Price</th>
        </tr>
        </thead>
        <tbody>
        ${items}                
        <tr><td colspan="3"><hr></td></tr>
        <tr>                        
            <td><b>Subtotal</b></td>
            <td>:</td>
            <td class="text-right"><b>${validator.unescape(settings.symbol)}${moneyFormat(
              allTransactions[index].subtotal,
            )}</b></td>
        </tr>
        <tr>
            <td>Discount</td>
            <td>:</td>
            <td class="text-right">${
              discount > 0
                ? validator.unescape(settings.symbol) +
                  moneyFormat(
                    parseFloat(allTransactions[index].discount).toFixed(2),
                  )
                : ""
            }</td>
        </tr>
        
        ${tax_row}
    
        <tr>
            <td><h5>Total</h5></td>
            <td><h5>:</h5></td>
            <td class="text-right">
                <h5>${validator.unescape(settings.symbol)}${moneyFormat(
                  allTransactions[index].total,
                )}</h5>
            </td>
        </tr>
        ${payment == 0 ? "" : payment}
        </tbody>
        </table>
        <br>
        <hr>
        <br>
        <p style="text-align: center;">
         ${validator.unescape(settings.footer)}
         </p>
        </div>`;

  //prevent DOM XSS; allow windows paths in img src
  receipt = DOMPurify.sanitize(receipt, { ALLOW_UNKNOWN_PROTOCOLS: true });

  $("#viewTransaction").html("");
  $("#viewTransaction").html(receipt);

  $("#orderModal").modal("show");
};

$("#status").on("change", function () {
  by_status = $(this).find("option:selected").val();
  loadTransactions();
});

$("#tills").on("change", function () {
  by_till = $(this).find("option:selected").val();
  loadTransactions();
});

$("#users").on("change", function () {
  by_user = $(this).find("option:selected").val();
  loadTransactions();
});

$("#reportrange").on("apply.daterangepicker", function (ev, picker) {
  start = picker.startDate.format("DD MMM YYYY hh:mm A");
  end = picker.endDate.format("DD MMM YYYY hh:mm A");

  start_date = picker.startDate.toDate().toJSON();
  end_date = picker.endDate.toDate().toJSON();

  loadTransactions();
});

function authenticate() {
  $(".loading").hide();
  $("body").attr("class", "login-page");
  $("#login").show();
}

$("body").on("submit", "#account", function (e) {
  e.preventDefault();
  let formData = $(this).serializeObject();

  if (formData.username == "" || formData.password == "") {
    notiflix.Report.warning("Incomplete form!", auth_empty, "Ok");
  } else {
    $.ajax({
      url: api + "users/login",
      type: "POST",
      data: JSON.stringify(formData),
      contentType: "application/json; charset=utf-8",
      cache: false,
      processData: false,
      success: function (data) {
        if (data.auth === true) {
          storage.set("auth", { auth: true });
          storage.set("user", data);
          ipcRenderer.send("app-reload", "");
          $("#login").hide();
        } else {
          notiflix.Report.warning("Oops!", auth_error, "Ok");
        }
      },
      error: function (data) {
        console.log(data);
  $.get(api + "customers/all").fail(function () {
    $("#patientReportBody").html(
      '<div class="alert alert-danger">Unable to load the patient report right now.</div>',
    );
  });
      },
    });
  }
});

$("#quit").on("click", function () {
  const diagOptions = {
    title: "Are you sure?",
    text: "You are about to close the application.",
    icon: "warning",
    okButtonText: "Close Application",
    cancelButtonText: "Cancel",
  };

  notiflix.Confirm.show(
    diagOptions.title,
    diagOptions.text,
    diagOptions.okButtonText,
    diagOptions.cancelButtonText,
    () => {
      ipcRenderer.send("app-quit", "");
    },
  );
});

ipcRenderer.on("click-element", (event, elementId) => {
  document.getElementById(elementId).click();
});
