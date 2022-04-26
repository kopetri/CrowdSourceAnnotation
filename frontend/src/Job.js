import React, { useState, useEffect } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import Button from "@material-ui/core/Button";
import { Redirect } from "react-router-dom";
import OnImagesLoaded from "react-on-images-loaded";

const get_items = elements => {
  return [
    [{ id: "left", filename: elements[0] }],
    [{ id: "center", filename: elements[1] }],
    [{ id: "right", filename: elements[2] }],
    [],
    []
  ];
};

const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the items look a bit nicer
  padding: 0,
  //width: "156px",
  //height: "156px",
  touchAction: "none",
  // styles we need to apply on draggables
  ...draggableStyle
});

const getBorderStyle = name => {
  let color = name === "best" ? "olivedrab" : "lightgray";
  color = name === "worst" ? "darkred" : color;
  return "5px solid " + color;
};

const getListStyle = (isDraggingOver, name) => ({
  background: isDraggingOver ? "lightgray" : "white",
  display: "flex",
  border: getBorderStyle(name),
  //padding: isDraggingOver ? 0 : 8,
  overflow: "hidden" /* Hide scrollbars */,
  height: "15vw",
  width: "26.667vw",
  minWidth: "100px",
  minHeight: "100px"
});

const build_droppable = (name, data_points, load_callback) => {
  return (
    <Droppable
      isDropDisabled={["left", "center", "right"].includes(name)}
      droppableId={name}
      direction="vertical"
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          style={getListStyle(snapshot.isDraggingOver, name)}
          {...provided.droppableProps}
        >
          {data_points.map((item, index) => (
            <Draggable key={item.id} draggableId={item.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={getItemStyle(
                    snapshot.isDragging,
                    provided.draggableProps.style
                  )}
                >
                  <OnImagesLoaded
                    onLoaded={load_callback}
                    onTimeout={() => {
                      console.log(
                        "unable to load image: /api/image/" +
                          item.model +
                          "/" +
                          item.version
                      );
                    }}
                    timeout={7000}
                  >
                    <img
                      id={name}
                      src={"/api/image/" + item.filename}
                      alt={item.filename}
                      style={{
                        height: "15vw",
                        width: "26.667vw",
                        minWidth: "100px",
                        minHeight: "100px"
                      }}
                    />
                  </OnImagesLoaded>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

function SampleTask() {
  document.body.style.overflow = "hidden";
  document.querySelector("html").scrollTop = window.scrollY;
  const [data, setData] = useState();
  const [items, setItems] = useState();
  const [start, setStart] = useState();
  const [n_loaded_images, setN_loaded_images] = useState(0);
  const [bestDuration, setBestDuration] = useState(0);
  const [worstDuration, setWorstDuration] = useState(0);
  const imageLoaded = () => {
    setN_loaded_images(n_loaded_images + 1);
  };
  useEffect(() => {
    if (n_loaded_images >= 2) {
      setStart(Date.now());
    }
  }, [n_loaded_images]);

  const onDragEnd = result => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }
    let src = id2idx(result.source.droppableId);
    let dst = id2idx(result.destination.droppableId);

    if (src === dst) {
      return;
    }

    if (src < 3 && dst < 3) {
      return;
    }

    let tmp = items[dst];
    items[dst] = items[src];
    if (dst === 3) setBestDuration(Date.now() - start);
    if (dst === 4) setWorstDuration(Date.now() - start);
    items[src] = tmp;
    setItems(currentItems => ({ items, ...currentItems }));
  };
  const has_selected_best_and_worst = () => {
    console.log(items);
    return items[3].length > 0 && items[4].length > 0;
  };
  const id2idx = id => {
    if (id === "left") return 0;
    if (id === "center") return 1;
    if (id === "right") return 2;
    if (id === "best") return 3;
    if (id === "worst") return 4;
  };

  useEffect(() => {
    fetch("/api/user_id")
      .then(result => result.json())
      .then(data => {
        setData(data);
      });
  }, []);

  useEffect(() => {
    if (!data) return;
    if (data["isDone"]) return;
    if (data["batch"].length > 0) {
      let task = data["batch"][0];
      console.log(get_items(task["data"]));

      setItems(get_items(task["data"]));
      setN_loaded_images(0);
    } else {
      data["isDone"] = true;
      setData(currentData => ({ data, ...currentData }));
    }
  }, [data]);

  const submitData = () => {
    let best = items[3];
    let worst = items[4];
    let second = items[0].length
      ? items[0]
      : items[1].length
      ? items[1]
      : items[2];
    best = best[0];
    worst = worst[0];
    second = second[0];
    best["duration"] = bestDuration;
    worst["duration"] = worstDuration;
    second["duration"] = -1;
    fetch("/api/submit/" + data["user_id"] + "/" + data["batch"][0]["name"], {
      method: "post",
      body: JSON.stringify({ best: best, second: second, worst: worst }),
      headers: { "Content-Type": "application/json" }
    })
      .then(response => response.json())
      .then(result => {
        if (result["success"]) {
          data["batch"].shift();
          setData(currentData => ({ data, ...currentData }));
        } else {
          console.log("Failed to submit data!");
        }
      })
      .catch(error => {
        console.error(error);
        window.location.href = "/";
      });
  };

  if (!data) return <>Loading page...</>;
  if (data["isDone"]) return <Redirect to={"/finished"} />;
  if (!items) return <>Loading page...</>;
  if (!data["started"]) return <Redirect to={"/"} />;
  return (
    <>
      <div
        style={{
          height: "100%",
          position: "absolute",
          overflow: "hidden",
          backgroundColor: "white",
          width: n_loaded_images >= 2 ? "0%" : "100%",
          opacity: 0.7
        }}
      ></div>
      <div class="center" style={{ width: "100%" }}>
        Remaining tasks: {data["batch"].length}
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          id="content-container"
          style={{ margin: "auto", padding: "10px", width: "fit-content" }}
        >
          <table class="tg">
            <thead>
              <tr>
                <th>{build_droppable("left", items[0], imageLoaded)}</th>
                <th>{build_droppable("center", items[1], imageLoaded)}</th>
                <th>{build_droppable("right", items[2], imageLoaded)}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Best</th>
                <th></th>
                <th>Worst</th>
              </tr>
              <tr>
                <td>{build_droppable("best", items[3], () => {})}</td>
                <td>
                  <div
                    style={{
                      margin: "auto",
                      display: has_selected_best_and_worst() ? true : "None"
                    }}
                  >
                    <div style={{ margin: "0 auto", width: "100px" }}>
                      <Button
                        id="confirm_button"
                        variant="contained"
                        color="primary"
                        onClick={submitData}
                        style={{ width: "100%" }}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                </td>
                <td>{build_droppable("worst", items[4], () => {})}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DragDropContext>
    </>
  );
}

export { SampleTask };
